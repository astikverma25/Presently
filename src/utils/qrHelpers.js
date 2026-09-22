export const parseQRPayload = (rawString) => {
  try {
    const data = JSON.parse(rawString);
    if (!data.s || !data.t) {
      throw new Error('Missing session or token fields in QR payload');
    }
    return {
      isValid: true,
      sessionId: data.s,
      token: data.t,
      expiresAt: data.exp,
      isExpired: data.exp ? new Date(data.exp).getTime() < Date.now() : false,
    };
  } catch (err) {
    return {
      isValid: false,
      error: err.message,
    };
  }
};
