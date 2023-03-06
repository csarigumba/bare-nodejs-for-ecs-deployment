const axios = require('axios');

const sav2Url = 'https://sa2-api.dev01.nihon-ma.co.jp/deals/12503';
async function main() {
  try {
    const response = await axios.get(sav2Url, {
      headers: {
        'x-sa-api-key': '323493cd-5ad4-46f7-8426-c53687f7cbc3',
      },
    });
    return response;
  } catch (error) {
    const response = {
      statusCode: error.response.status,
    };
    console.log(response);
    return response;
  }
}

main();
