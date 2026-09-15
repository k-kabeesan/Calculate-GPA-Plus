import fetch from 'node-fetch';

async function testApiErrors() {
  console.log('--- Testing API Error Responses ---');

  // Test 1: Empty payload
  const res1 = await fetch('http://localhost:5000/api/ai/extract-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: '' })
  });

  const text1 = await res1.text();
  console.log('Test 1 Status:', res1.status);
  console.log('Test 1 Body:', text1);

  let json1;
  try {
    json1 = JSON.parse(text1);
  } catch {
    console.error('FAIL: Response 1 is not valid JSON!');
    process.exit(1);
  }

  if (json1.success !== false || typeof json1.error !== 'string') {
    console.error('FAIL: Response 1 schema does not match error format:', json1);
    process.exit(1);
  }

  // Test 2: Text with no subjects
  const res2 = await fetch('http://localhost:5000/api/ai/extract-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Random text with no academic subjects or modules at all.' })
  });

  const text2 = await res2.text();
  console.log('Test 2 Status:', res2.status);
  console.log('Test 2 Body:', text2);

  let json2;
  try {
    json2 = JSON.parse(text2);
  } catch {
    console.error('FAIL: Response 2 is not valid JSON!');
    process.exit(1);
  }

  if (json2.success !== false || typeof json2.error !== 'string') {
    console.error('FAIL: Response 2 schema does not match error format:', json2);
    process.exit(1);
  }

  console.log('>>> ALL API ERROR RESPONSE TESTS PASSED! <<<');
}

testApiErrors();
