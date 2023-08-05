const functions = require('firebase-functions');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); ({
  origin: true
})
const axios = require('axios');

const app = express();

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.post('/chat', async (req, res) => {
  const userQuestion = req.body.question;
  const text = "검색하려는 텍스트";  // 검색하려는 텍스트를 여기에 입력하세요
  let relevant_parts = find_relevant_parts(text, userQuestion);
  let relevant_text = relevant_parts.join(' ');  // 각 부분을 하나의 문자열로 합칩니다
  
  function find_relevant_parts(text, user_question) {
    let keywords = user_question.toLowerCase().split(' ');
    let text_parts = text.toLowerCase().split(';');
    
    let first_word = keywords[0];
    let second_word = keywords[1] || "";
  
    let selected_parts = [];

    for (let length of [3, 4, 5]) {
        let first_word_prefix = first_word.slice(0, length);
        let prefix_parts = text_parts.filter(part => part.split(' ').some(word => word.startsWith(first_word_prefix)) && !selected_parts.includes(part));
        selected_parts.push(...prefix_parts.slice(0, 2));

        if (selected_parts.length >= 5) {
            break;
        }
    }
  
    let second_word_parts = text_parts.filter(part => part.split(' ').includes(second_word) && !selected_parts.includes(part));
    selected_parts.push(...second_word_parts.slice(0, 3));

    for (let length of [2, 3]) {
        let second_word_prefix = second_word.slice(0, length);
        let prefix_parts = text_parts.filter(part => part.split(' ').some(word => word.startsWith(second_word_prefix)) && !selected_parts.includes(part));
        selected_parts.push(...prefix_parts.slice(0, 2));

        if (selected_parts.length >= 10) {
            break;
        }
    }

    if (selected_parts.length < 10) {
        let scores = text_parts.filter(part => !selected_parts.includes(part)).map(part => [keywords.reduce((sum, keyword) => sum + part.includes(keyword), 0), part]);
        scores.sort(([score1, part1], [score2, part2]) => score2 - score1);

        for (let [score, part] of scores) {
            if (selected_parts.length + 1 <= 10) {
                selected_parts.push(part);
            }
            if (selected_parts.length >= 10) {
                break;
            }
        }
    }

    return selected_parts;
}
// Implement your find_relevant_parts function here in JavaScript

  // find_relevant_parts 함수 정의 등 여기에 추가 작업 내용을 넣으세요.

  const systemMessage = `${relevant_text}\n\nBased on the above, please answer in a maximum of 3 sentences.`;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/engines/gpt-3.5-turbo/completions',
      {
        prompt: systemMessage,
        max_tokens: 100,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer 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',
        },
      }
    );

    res.json({ answer: response.data.choices[0].text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error with OpenAI request' });
  }
});

exports.app = functions.region("asia-northeast3").https.onRequest(app);
