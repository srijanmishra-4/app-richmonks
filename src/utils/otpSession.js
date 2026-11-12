// In memory only, so a fresh page load or a typed /otp URL never has a pending number.
let pendingPhone = null;

export function startOtpSession(phone) {
  pendingPhone = phone;
}

export function hasOtpSession(phone) {
  return !!phone && pendingPhone === phone;
}
