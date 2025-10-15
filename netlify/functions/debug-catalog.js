exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      path: event.path,
      httpMethod: event.httpMethod,
      queryStringParameters: event.queryStringParameters,
      headers: event.headers,
      expectedPath: '/catalog/movie/malayalam_movies_latest',
      actualCatalogURL: 'https://strem-mal-addon.netlify.app/.netlify/functions/catalog/movie/malayalam_movies_latest'
    })
  };
};
