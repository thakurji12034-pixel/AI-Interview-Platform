const http = require('http');

async function testApi() {
  console.log('Testing ML API on live backend (http://127.0.0.1:5000)...');

  // 1. Unauthenticated request to /predict-category
  const unauthRes = await fetch('http://127.0.0.1:5000/api/v1/resumes/predict-category', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Java developer' }),
  });
  console.log('1. Unauthenticated POST /predict-category status (expect 401):', unauthRes.status);

  // 2. Unauthenticated request to /ml/metadata
  const unauthMeta = await fetch('http://127.0.0.1:5000/api/v1/resumes/ml/metadata');
  console.log('2. Unauthenticated GET /ml/metadata status (expect 401):', unauthMeta.status);

  // 3. Login as candidate to get token
  const loginRes = await fetch('http://127.0.0.1:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'Test@12345' }),
  });

  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  console.log('3. Candidate login status:', loginRes.status, '| Token present:', Boolean(token));

  if (!token) {
    console.error('Could not authenticate candidate:', loginData);
    return;
  }

  // 4. Test validation error (empty string)
  const emptyRes = await fetch('http://127.0.0.1:5000/api/v1/resumes/predict-category', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text: '   ' }),
  });
  const emptyData = await emptyRes.json();
  console.log('4. Empty text POST status (expect 400):', emptyRes.status, '| Error code:', emptyData.error?.code);

  // 5. Test valid Java Developer resume text
  const javaText = 'Experienced Java Developer with Spring Boot, Hibernate, Kafka, and microservices architecture.';
  const javaRes = await fetch('http://127.0.0.1:5000/api/v1/resumes/predict-category', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text: javaText }),
  });
  const javaData = await javaRes.json();
  console.log('5. Java prediction status:', javaRes.status, '| Category:', javaData.predictedCategory, '| Conf:', javaData.confidence);
  console.log('   Top 3 predictions:', javaData.topPredictions?.slice(0, 3));

  // 6. Test valid Python Developer resume text
  const pyText = 'Senior Python Engineer building scalable backend APIs with FastAPI, Django, PostgreSQL, Celery, and Docker.';
  const pyRes = await fetch('http://127.0.0.1:5000/api/v1/resumes/predict-category', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text: pyText }),
  });
  const pyData = await pyRes.json();
  console.log('6. Python prediction status:', pyRes.status, '| Category:', pyData.predictedCategory, '| Conf:', pyData.confidence);

  // 7. Test metadata endpoint
  const metaRes = await fetch('http://127.0.0.1:5000/api/v1/resumes/ml/metadata', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const metaData = await metaRes.json();
  console.log('7. Metadata status:', metaRes.status, '| Classes:', metaData.metadata?.numClasses, '| Accuracy:', metaData.metadata?.metrics?.accuracy);
}

testApi().catch(console.error);
