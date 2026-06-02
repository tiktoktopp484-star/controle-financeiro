let biometricAvailable = false;

export async function checkBiometricAvailability(): Promise<boolean> {
  try {
    if (typeof PublicKeyCredential !== 'undefined') {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      biometricAvailable = available;
    }
  } catch {
    biometricAvailable = false;
  }

  if (!biometricAvailable) {
    try {
      const ua = navigator.userAgent.toLowerCase();
      biometricAvailable = /android|iphone|ipad|ipod/.test(ua);
    } catch {
      biometricAvailable = false;
    }
  }

  return biometricAvailable;
}

export async function authenticateWithBiometric(reason: string = 'Fazer login no Controle Financeiro'): Promise<boolean> {
  try {
    if (typeof PublicKeyCredential !== 'undefined') {
      const credential = await navigator.credentials.get({
        mediation: 'optional',
        publicKey: {
          challenge: new Uint8Array(32),
          rpId: window.location.hostname,
          allowCredentials: [],
          userVerification: 'required',
        } as any,
      });
      return !!credential;
    }
    return false;
  } catch {
    return false;
  }
}
