import http from './http';

export const listInterviews = () =>
  http.get('/interviews').then((res) => res.data.interviews);

export const createInterview = (payload) =>
  http.post('/interviews', payload).then((res) => res.data.interview);

export const changeStatus = (id, status) =>
  http.patch(`/interviews/${id}/status`, { status }).then((res) => res.data.interview);

export const errorMessage = (err) => {
  const data = err.response?.data;
  return data?.errors?.join(', ') || data?.message || 'Something went wrong';
};