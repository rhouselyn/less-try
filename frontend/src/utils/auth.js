/** Token 管理和 axios 拦截器。 */
import axios from 'axios';

const T = 'gualingo_tokens';
const U = 'gualingo_user';

export const auth = {
  get tokens() { try { return JSON.parse(localStorage.getItem(T)) } catch { return null } },
  set tokens(v) { localStorage.setItem(T, JSON.stringify(v)) },
  get accessToken() { return this.tokens?.access_token || null },
  get user() { try { return JSON.parse(localStorage.getItem(U)) } catch { return null } },
  set user(v) { localStorage.setItem(U, JSON.stringify(v)) },
  get isLoggedIn() { return !!this.accessToken },

  async login(email, password) {
    const { data } = await axios.post('/api/auth/login', { email, password });
    this.tokens = data;
    await this.fetchMe();
  },

  async register(email, password, name) {
    const { data } = await axios.post('/api/auth/register', { email, password, name });
    this.tokens = data;
    await this.fetchMe();
  },

  async fetchMe() {
    if (!this.accessToken) return null;
    try {
      const { data } = await axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${this.accessToken}` } });
      this.user = data;
      return data;
    } catch { this.clear(); return null }
  },

  clear() { localStorage.removeItem(T); localStorage.removeItem(U) },
  logout() { this.clear(); window.location.reload() },
};

// 自动附加 token
axios.interceptors.request.use(c => {
  if (auth.accessToken) c.headers.Authorization = `Bearer ${auth.accessToken}`;
  return c;
});

// 401 时尝试刷新
axios.interceptors.response.use(r => r, async err => {
  if (err.response?.status === 401 && !err.config._retry && auth.tokens?.refresh_token) {
    err.config._retry = true;
    try {
      const { data } = await axios.post('/api/auth/refresh', auth.tokens.refresh_token, {
        headers: { 'Content-Type': 'text/plain' }
      });
      auth.tokens = data;
      err.config.headers.Authorization = `Bearer ${data.access_token}`;
      return axios(err.config);
    } catch { auth.clear(); window.location.reload() }
  }
  return Promise.reject(err);
});
