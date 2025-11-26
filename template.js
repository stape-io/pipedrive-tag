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

/*==============================================================================
==============================================================================*/

const eventData = getAllEventData();

checkGuardClauses();

if (data.type === 'lead') {
  createLead(createPerson());
} else {
  createPerson();
}

if (data.useOptimisticScenario) {
  data.gtmOnSuccess();
}

/*==============================================================================
VENDOR RELATED FUNCTIONS
==============================================================================*/

function createPerson() {
  const requestUrl = 'https://api.pipedrive.com/v2/persons?api_token=' + enc(data.apiToken);
  const postBody = makeTableMap(data.person || [], 'field', 'value') || {};

  if (data.name) postBody.name = data.name;
  if (data.email) postBody.emails = [data.email];
  if (data.phone) postBody.phones = [data.phone];

  log({
    Name: 'PipeDrive',
    Type: 'Request',
    EventName: 'Person',
    RequestMethod: 'POST',
    RequestUrl: requestUrl,
    RequestBody: postBody
  });

  return sendHttpRequest(
    requestUrl,
    (statusCode, headers, body) => {
      log({
        Name: 'PipeDrive',
        Type: 'Response',
        EventName: 'Person',
        ResponseStatusCode: statusCode,
        ResponseHeaders: headers,
        ResponseBody: body
      });

      if (statusCode >= 200 && statusCode < 303) {
        if (data.type === 'lead') {
          return JSON.parse(body).data.id;
        } else {
          data.gtmOnSuccess();
        }
      } else {
        data.gtmOnFailure();
      }
    },
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST'
    },
    JSON.stringify(postBody)
  );
}

function createLead() {
  const requestUrl = 'https://api.pipedrive.com/v1/leads?api_token=' + enc(data.apiToken);
  const postBody = makeTableMap(data.lead || [], 'field', 'value') || {};

  if (data.leadName) postBody.name = data.leadName;

  log({
    Name: 'PipeDrive',
    Type: 'Request',
    EventName: 'Lead',
    RequestMethod: 'POST',
    RequestUrl: requestUrl,
    RequestBody: postBody
  });

  return sendHttpRequest(
    requestUrl,
    (statusCode, headers, body) => {
      log({
        Name: 'PipeDrive',
        Type: 'Response',
        EventName: 'Lead',
        ResponseStatusCode: statusCode,
        ResponseHeaders: headers,
        ResponseBody: body
      });

      if (statusCode >= 200 && statusCode < 303) {
        data.gtmOnSuccess();
      } else {
        data.gtmOnFailure();
      }
    },
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST'
    },
    JSON.stringify(postBody)
  );
}

/*==============================================================================
HELPERS
==============================================================================*/

function checkGuardClauses() {
  const url = eventData.page_location || getRequestHeader('referer');

  if (!isConsentGivenOrNotRequired(data, eventData)) {
    return data.gtmOnSuccess();
  }

  if (url && url.lastIndexOf('https://gtm-msr.appspot.com/', 0) === 0) {
    return data.gtmOnSuccess();
  }
}

function enc(data) {
  data = data || '';
  return encodeUriComponent(data);
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

  rawDataToLog.TraceId = getRequestHeader('trace-id');

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
  const isDebug = !!(containerVersion && (containerVersion.debugMode || containerVersion.previewMode));

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
