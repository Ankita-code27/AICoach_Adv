import { API_BASE_URL } from './http.js';

async function uploadResume(file, idToken) {
  const formData = new FormData();
  formData.append('resume', file);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/resume/parse`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${idToken}`,
      },
      body: formData,
    });
  } catch {
    throw new Error('Unable to reach the resume service. Please try again.');
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    // Use the generic message below when a proxy or server returns non-JSON.
  }

  if (!response.ok) {
    throw new Error(payload.message || "We couldn't analyze your resume. Please try again.");
  }

  if (!payload.resumeContext) {
    throw new Error("We couldn't analyze your resume. Please try again.");
  }

  return payload.resumeContext;
}

export { uploadResume };
