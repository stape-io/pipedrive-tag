const sendHttpRequest = require('sendHttpRequest');
const JSON = require('JSON');
const getRequestHeader = require('getRequestHeader');
const encodeUriComponent = require('encodeUriComponent');
const logToConsole = require('logToConsole');
const getContainerVersion = require('getContainerVersion');
const makeTableMap = require('makeTableMap');
const getTimestampMillis = require('getTimestampMillis');
const BigQuery = require('BigQuery');
const getAllEventData = require('getAllEventData');
const Promise = require('Promise');
const makeNumber = require('makeNumber');

/*==============================================================================
==============================================================================*/

const eventData = getAllEventData();
let person;
let lead;

if (checkGuardClauses()) return;

if (data.type === 'person') createPerson();

if (data.type === 'lead') {
  if (data.createPerson) createPerson();
  else createLead();
}

if (data.useOptimisticScenario) {
  data.gtmOnSuccess();
}

/*==============================================================================
VENDOR RELATED FUNCTIONS
==============================================================================*/

function createPerson() {
  const requestUrl = 'https://api.pipedrive.com/api/v2/persons';
  const postBody = makeTableMap(data.person || [], 'field', 'value') || {};
  const requestOptions = {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-api-token': data.apiToken
    },
    method: 'POST'
  };

  if (data.name || data.newLeadFullName) postBody.name = data.name || data.newLeadFullName;
  if (data.newLeadFirstName) postBody.first_name = data.newLeadFirstName;
  if (data.newLeadLastName) postBody.last_name = data.newLeadLastName;
  if (data.email) postBody.emails = [{ value: data.email }];
  if (data.phone) postBody.phones = [{ value: data.phone }];

  log({
    Name: 'Pipedrive',
    Type: 'Request',
    EventName: 'Person',
    RequestMethod: 'POST',
    RequestUrl: requestUrl,
    RequestBody: postBody
  });

  return sendHttpRequest(requestUrl, requestOptions, JSON.stringify(postBody))
    .then((response) => {
      const body = JSON.parse(response.body);
      log({
        Name: 'Pipedrive',
        Type: 'Response',
        EventName: 'Person',
        ResponseStatusCode: response.statusCode,
        ResponseHeaders: response.headers,
        ResponseBody: response.body
      });

      if (body.success) {
        if (data.type === 'lead') {
          const personId = body.data.id;
          const organizationId = body.data.org_id;
          return createLead(personId, organizationId);
        } else {
          data.gtmOnSuccess();
        }
      } else {
        log({
          Name: 'Pipedrive',
          Type: 'Message',
          EventName: 'Lead',
          Message: body.code,
          Reason: body.error
        });
        return data.gtmOnFailure();
      }
    })
    .catch((error) => {
      log({
        Name: 'Pipedrive',
        Type: 'Message',
        EventName: 'Person',
        Message: 'API call failed or timed out',
        Reason: error.reason
      });
    });
}

function createLead(personId, organizationId) {
  const requestUrl = 'https://api.pipedrive.com/v1/leads';
  const postBody = makeTableMap(data.lead || [], 'field', 'value') || {};
  const requestOptions = {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-api-token': data.apiToken
    },
    method: 'POST'
  };

  if (!data.title) {
    log({
      Name: 'Pipedrive',
      Type: 'Message',
      EventName: 'Lead',
      Message: 'API not called',
      Reason: 'Title is required for creating Lead'
    });
    return data.gtmOnFailure();
  }
  personId = personId || data.personId;
  organizationId = organizationId || data.organizationId;
  postBody.title = data.title;
  if (personId) postBody.person_id = makeNumber(personId);
  if (organizationId) postBody.organization_id = makeNumber(organizationId);

  log({
    Name: 'Pipedrive',
    Type: 'Request',
    EventName: 'Lead',
    RequestMethod: 'POST',
    RequestUrl: requestUrl,
    RequestBody: postBody
  });

  return sendHttpRequest(requestUrl, requestOptions, JSON.stringify(postBody))
    .then((response) => {
      const body = JSON.parse(response.body);
      log({
        Name: 'Pipedrive',
        Type: 'Response',
        EventName: 'Lead',
        ResponseStatusCode: response.statusCode,
        ResponseHeaders: response.headers,
        ResponseBody: response.body
      });

      if (body.success) {
        return data.gtmOnSuccess();
      } else {
        log({
          Name: 'Pipedrive',
          Type: 'Message',
          EventName: 'Lead',
          Message: body.code,
          Reason: body.error
        });
        return data.gtmOnFailure();
      }
    })
    .catch((error) => {
      log({
        Name: 'Pipedrive',
        Type: 'Message',
        EventName: 'Lead',
        Message: 'API call failed or timed out',
        Reason: error.reason
      });
    });
}

/*==============================================================================
HELPERS
==============================================================================*/

function checkGuardClauses() {
  const url = eventData.page_location || getRequestHeader('referer');
  const createPersonRequirement =
    !(data.newLeadFullName || (data.newLeadFirstName && data.newLeadLastName)) ||
    (data.newLeadFullName && (data.newLeadFirstName || data.newLeadLastName));

  if (!isConsentGivenOrNotRequired(data, eventData)) {
    data.gtmOnSuccess();
    return true;
  }

  if (url && url.lastIndexOf('https://gtm-msr.appspot.com/', 0) === 0) {
    data.gtmOnSuccess();
    return true;
  }

  if (data.createPerson && createPersonRequirement) {
    log({
      Name: 'Pipedrive',
      Type: 'Message',
      EventName: 'Lead',
      Message: 'API not called',
      Reason: 'Provide either Full Name OR both First Name and Last Name to create a new Person.'
    });
    data.gtmOnFailure();
    return true;
  }

  if (data.type === 'lead' && !data.createPerson) {
    if (!data.personId && !data.organizationId) {
      //requirement for lead request
      log({
        Name: 'Pipedrive',
        Type: 'Message',
        EventName: 'Lead',
        Message: 'API not called',
        Reason: 'Person ID or Organization ID must be set to create a Lead.'
      });
      data.gtmOnFailure();
      return true;
    }
  }
}

function isConsentGivenOrNotRequired(data, eventData) {
  if (data.adStorageConsent !== 'required') return true;
  if (eventData.consent_state) return !!eventData.consent_state.ad_storage;
  const xGaGcs = eventData['x-ga-gcs'] || ''; // x-ga-gcs is a string like "G110"
  return xGaGcs[2] === '1';
}

function log(rawDataToLog) {
  const logDestinationsHandlers = {};
  if (determinateIsLoggingEnabled()) logDestinationsHandlers.console = logConsole;
  if (determinateIsLoggingEnabledForBigQuery()) logDestinationsHandlers.bigQuery = logToBigQuery;

  //rawDataToLog.TraceId = getRequestHeader('trace-id');

  const keyMappings = {
    // No transformation for Console is needed.
    bigQuery: {
      Name: 'tag_name',
      Type: 'type',
      TraceId: 'trace_id',
      EventName: 'event_name',
      RequestMethod: 'request_method',
      RequestUrl: 'request_url',
      RequestBody: 'request_body',
      ResponseStatusCode: 'response_status_code',
      ResponseHeaders: 'response_headers',
      ResponseBody: 'response_body'
    }
  };

  for (const logDestination in logDestinationsHandlers) {
    const handler = logDestinationsHandlers[logDestination];
    if (!handler) continue;

    const mapping = keyMappings[logDestination];
    const dataToLog = mapping ? {} : rawDataToLog;

    if (mapping) {
      for (const key in rawDataToLog) {
        const mappedKey = mapping[key] || key;
        dataToLog[mappedKey] = rawDataToLog[key];
      }
    }

    handler(dataToLog);
  }
}

function logConsole(dataToLog) {
  logToConsole(JSON.stringify(dataToLog));
}

function logToBigQuery(dataToLog) {
  const connectionInfo = {
    projectId: data.logBigQueryProjectId,
    datasetId: data.logBigQueryDatasetId,
    tableId: data.logBigQueryTableId
  };

  dataToLog.timestamp = getTimestampMillis();

  ['request_body', 'response_headers', 'response_body'].forEach((p) => {
    dataToLog[p] = JSON.stringify(dataToLog[p]);
  });

  BigQuery.insert(connectionInfo, [dataToLog], { ignoreUnknownValues: true });
}

function determinateIsLoggingEnabled() {
  const containerVersion = getContainerVersion();
  const isDebug = !!(
    containerVersion &&
    (containerVersion.debugMode || containerVersion.previewMode)
  );

  if (!data.logType) {
    return isDebug;
  }

  if (data.logType === 'no') {
    return false;
  }

  if (data.logType === 'debug') {
    return isDebug;
  }

  return data.logType === 'always';
}

function determinateIsLoggingEnabledForBigQuery() {
  if (data.bigQueryLogType === 'no') return false;
  return data.bigQueryLogType === 'always';
}
