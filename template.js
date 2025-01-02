const sendHttpRequest = require('sendHttpRequest');
const JSON = require('JSON');
const getRequestHeader = require('getRequestHeader');
const encodeUriComponent = require('encodeUriComponent');
const logToConsole = require('logToConsole');
const getContainerVersion = require('getContainerVersion');
const makeString = require('makeString');
const makeTableMap = require('makeTableMap');

const containerVersion = getContainerVersion();
const isDebug = containerVersion.debugMode;
const isLoggingEnabled = determinateIsLoggingEnabled();
const traceId = getRequestHeader('trace-id');


if (data.type === 'lead') {
  createLead(createPerson());
} else {
  createPerson();
}

function createPerson() {
  const requestUrl = 'https://api.pipedrive.com/v1/persons?api_token=' + enc(data.apiToken);
  const postBody = makeTableMap(data.person || [], 'field', 'value');

  if (data.name) postBody.name = data.name;
  if (data.email) postBody.email = [data.email];
  if (data.phone) postBody.phone = [data.phone];

  if (isLoggingEnabled) {
    logToConsole(
      JSON.stringify({
        Name: 'PipeDrive',
        Type: 'Request',
        TraceId: traceId,
        EventName: 'Person',
        RequestMethod: 'POST',
        RequestUrl: requestUrl,
        RequestBody: postBody
      })
    );
  }

  return sendHttpRequest(
    requestUrl,
    (statusCode, headers, body) => {
      if (isLoggingEnabled) {
        logToConsole(
          JSON.stringify({
            Name: 'PipeDrive',
            Type: 'Response',
            TraceId: traceId,
            EventName: 'Person',
            ResponseStatusCode: statusCode,
            ResponseHeaders: headers,
            ResponseBody: body
          })
        );
      }

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
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST'
    },
    JSON.stringify(postBody)
  );
}

function createLead() {
  const requestUrl = 'https://api.pipedrive.com/v1/leads?api_token=' + enc(data.apiToken);
  const postBody = makeTableMap(data.lead || [], 'field', 'value');

  if (data.leadName) postBody.name = data.leadName;

  if (isLoggingEnabled) {
    logToConsole(
      JSON.stringify({
        Name: 'PipeDrive',
        Type: 'Request',
        TraceId: traceId,
        EventName: 'Lead',
        RequestMethod: 'POST',
        RequestUrl: requestUrl,
        RequestBody: postBody
      })
    );
  }

  return sendHttpRequest(
    requestUrl,
    (statusCode, headers, body) => {
      if (isLoggingEnabled) {
        logToConsole(
          JSON.stringify({
            Name: 'PipeDrive',
            Type: 'Response',
            TraceId: traceId,
            EventName: 'Lead',
            ResponseStatusCode: statusCode,
            ResponseHeaders: headers,
            ResponseBody: body
          })
        );
      }

      if (statusCode >= 200 && statusCode < 303) {
        data.gtmOnSuccess();
      } else {
        data.gtmOnFailure();
      }
    },
    {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST'
    },
    JSON.stringify(postBody)
  );
}

function enc(data) {
  data = data || '';
  return encodeUriComponent(makeString(data));
}

function determinateIsLoggingEnabled() {
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
