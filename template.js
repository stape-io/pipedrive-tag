const sendHttpRequest = require('sendHttpRequest');
const JSON = require('JSON');
const getRequestHeader = require('getRequestHeader');
const makeTableMap = require('makeTableMap');
const getAllEventData = require('getAllEventData');
const makeString = require('makeString');
const makeInteger = require('makeInteger');
const getType = require('getType');

/*==============================================================================
==============================================================================*/

const eventData = getAllEventData();

if (checkGuardClauses(data, eventData)) return;

if (data.type === 'person') createPerson();
else if (data.type === 'lead') {
  if (data.createPersonBeforeLead) createPerson();
  else createLead();
}

if (data.useOptimisticScenario) {
  return data.gtmOnSuccess();
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

  if (data.name) postBody.name = data.name;
  if (data.email) postBody.emails = [{ value: data.email }];
  if (data.phone) postBody.phones = [{ value: data.phone }];

  const customFields = makeTableMap(data.personCustomFields || [], 'field', 'value');
  if (customFields) postBody.custom_fields = customFields;

  // Backward compatibility v1 -> v2.
  if (getType(postBody.visible_to) === 'string') {
    postBody.visible_to = makeInteger(postBody.visible_to);
  }
  if (postBody.label) {
    postBody.label_ids = [makeInteger(postBody.label)];
    postBody.label = undefined;
  }

  return sendHttpRequest(requestUrl, requestOptions, JSON.stringify(postBody))
    .then((response) => {
      const body = JSON.parse(response.body || '{}');
      if (response.statusCode === 200 && body.success) {
        if (data.type === 'lead') {
          const personId = body.data.id;
          const organizationId = body.data.org_id;
          return createLead(personId, organizationId);
        } else {
          return data.gtmOnSuccess();
        }
      } else {
        return data.gtmOnFailure();
      }
    })
    .catch((error) => {
      return data.gtmOnFailure();
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

  personId = personId || data.personId;
  organizationId = organizationId || data.organizationId;
  postBody.title = data.title ? makeString(data.title) : undefined;
  if (personId) postBody.person_id = makeInteger(personId);
  if (organizationId) postBody.organization_id = makeInteger(organizationId);

  return sendHttpRequest(requestUrl, requestOptions, JSON.stringify(postBody))
    .then((response) => {
      const body = JSON.parse(response.body || '{}');
      if (response.statusCode === 201 && body.success) {
        return data.gtmOnSuccess();
      } else {
        return data.gtmOnFailure();
      }
    })
    .catch((error) => {
      return data.gtmOnFailure();
    });
}

/*==============================================================================
HELPERS
==============================================================================*/

function checkGuardClauses(data, eventData) {
  if (!isConsentGivenOrNotRequired(data, eventData)) {
    data.gtmOnSuccess();
    return true;
  }

  const url = eventData.page_location || getRequestHeader('referer');
  if (url && url.lastIndexOf('https://gtm-msr.appspot.com/', 0) === 0) {
    data.gtmOnSuccess();
    return true;
  }
}

function isConsentGivenOrNotRequired(data, eventData) {
  if (data.adStorageConsent !== 'required') return true;
  if (eventData.consent_state) return !!eventData.consent_state.ad_storage;
  const xGaGcs = eventData['x-ga-gcs'] || ''; // x-ga-gcs is a string like "G110"
  return xGaGcs[2] === '1';
}
