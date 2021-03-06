import 'whatwg-fetch';

// Parse JSON returned by a request
function parseJSON(response) {
  return response.json();
}

// Check the status of an HTTP request
function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response;
  }

  return response
    .json()
    .then(({ error }) => {
        if (response.status === 401) {
            throw new Error('unauthorized');
        } else {
            throw new Error(error || 'api_error');
        }
    });
}

function wrapFetch(route, params, authToken) {
  let computedRoute = route.url;
  const computedOptions = {
    method: route.method.toLowerCase(),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: authToken,
    },
  };

  // Replace all named parameters in the URL
  const mutableParams = params || {};
  Object.keys(mutableParams).forEach((key) => {
    if (computedRoute.indexOf(`:${key}`) !== -1) {
      computedRoute = computedRoute.replace(`:${key}`, encodeURIComponent(mutableParams[key]));
      delete mutableParams[key];
    }
  });

  // If it's a GET request, append all other params in the query string.
  // Otherwise, attach a JSON body to the POST request.
  if (route.method.toLowerCase() === 'get') {
    const queryParams = [];
    Object.keys(mutableParams).forEach((key) => queryParams.push(`${key}=${encodeURIComponent(mutableParams[key])}`));

    if (queryParams.length > 0) {
      computedRoute += `?${queryParams.join('&')}`;
    }
  } else {
    computedOptions.body = JSON.stringify(mutableParams.body);
  }

  // Process the request
  return fetch(computedRoute, computedOptions);
}

// Process an HTTP request
export default function Request(route, params) {
    const token = window.localStorage.getItem('authToken');

    // No auth
    if (route.isProtected && !token) {
        // Redirect and throw error
        const currentPath = window.location.pathname;
        window.location = `/login?redirect=${encodeURIComponent(currentPath)}`;
        throw new Error('not_logged_in');
    }

  return wrapFetch(route, params, token)
    .then(checkStatus)
    .then(parseJSON)
    .catch((err) => {
      if (err.message === 'unauthorized') {
        const currentPath = window.location.pathname;
        window.location = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
      throw err;
    });
}
