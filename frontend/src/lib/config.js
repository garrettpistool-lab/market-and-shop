import { isAuth0Configured } from './auth0Config';

export const isDev = import.meta.env.DEV;
export const auth0Enabled = isAuth0Configured();

export function filterProductionUsers(users) {
  return Array.isArray(users) ? users : [];
}