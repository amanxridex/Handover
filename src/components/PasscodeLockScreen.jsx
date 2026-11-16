import React, { useEffect, useState } from 'react';
import avatarDefault from '../assets/avatar-default.jpg';
import {
  verifyBiometricPasskey,
  verifyPasscode,
} from '../services/settingsService';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerSuccessHaptic,
} from '../utils/nativeBridge';

const KEYPAD_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export default function PasscodeLockScreen({
  mode = 'unlock', // 'unlock' | 'setup'
  user,
  storedPasscodeHash,
  biometricCredentialId,
  onUnlocked,
  onPasscodeSet,
  onCancel,
  onForgotLogout,
}) {
  const [pin, setPin] = useState('');
  const [confirmFirstPin, setConfirmFirstPin] = useState('');
  const [setupStage, setSetupStage] = useState('enter'); // enter | confirm
  const [errorMsg, setErrorMsg] = useState('');
  const [shaking, setShaking] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  const triggerShake = (message) => {
    triggerMediumHaptic(true);
    setErrorMsg(message);
    setShaking(true);
    setPin('');
    setTimeout(() => setShaking(false), 450);
  };

  const handleBiometricUnlock = async () => {
    if (!biometricCredentialId || biometricBusy) return;
    setBiometricBusy(true);
    setErrorMsg('');
    const result = await verifyBiometricPasskey(biometricCredentialId);
    setBiometricBusy(false);
    if (result?.verified) {
      triggerSuccessHaptic(true);
      onUnlocked?.();
    } else if (!result?.unsupported) {
      setErrorMsg('Biometric check cancelled. Enter your 4-digit passcode.');
    }
  };

  useEffect(() => {
    if (mode === 'unlock' && biometricCredentialId) {
      handleBiometricUnlock();
    }
  }, [mode]);

  const handleDigitPress = async (digit) => {
    if (pin.length >= 4) return;
    triggerLightHaptic();
    const nextPin = `${pin}${digit}`;
    setPin(nextPin);
    setErrorMsg('');

    if (nextPin.length < 4) return;

    if (mode === 'unlock') {
      const ok = await verifyPasscode(nextPin, storedPasscodeHash);
      if (ok) {
        triggerSuccessHaptic(true);
        onUnlocked?.();
      } else {
        triggerShake('Incorrect passcode. Try again.');
      }
      return;
    }

    // Setup mode (2-step)
    if (setupStage === 'enter') {
      setConfirmFirstPin(nextPin);
      setSetupStage('confirm');
      setPin('');
      return;
    }

    if (nextPin !== confirmFirstPin) {
      setSetupStage('enter');
      setConfirmFirstPin('');
      triggerShake('Passcodes did not match. Start again.');
      return;
    }

    triggerSuccessHaptic(true);
    onPasscodeSet?.(nextPin);
  };

  const handleBackspace = () => {
    if (!pin) return;
    triggerLightHaptic();
    setPin((prev) => prev.slice(0, -1));
  };

  const heading =
    mode === 'unlock'
      ? 'Enter Passcode'
      : setupStage === 'enter'
        ? 'Create 4-digit Passcode'
        : 'Confirm Passcode';

  const subtitle =
    mode === 'unlock'
      ? `Unlock Handover as @${user?.username || 'member'}`
      : setupStage === 'enter'
        ? 'Used with Face ID / Fingerprint to protect your account'
        : 'Re-enter the same 4 digits to confirm';

  return (
    <div
      className="lock-screen-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={heading}
    >
      <div className="lock-screen-glow" aria-hidden="true" />

      <div className="lock-screen-inner">
        {mode === 'setup' && onCancel && (
          <button
            type="button"
            className="lock-cancel-top"
            onClick={() => {
              triggerLightHaptic();
              onCancel();
            }}
          >
            Cancel
          </button>
        )}

        <div className="lock-header">
          <img
            src={user?.avatar || avatarDefault}
            alt={user?.name || 'Profile'}
            className="lock-avatar"
          />
          <h2 className="lock-title">{heading}</h2>
          <p className="lock-subtitle">{subtitle}</p>
        </div>

        <div className={`lock-dots-row ${shaking ? 'is-shaking' : ''}`}>
          {[0, 1, 2, 3].map((idx) => (
            <span
              key={idx}
              className={`lock-dot ${pin.length > idx ? 'filled' : ''}`}
            />
          ))}
        </div>

        {errorMsg && (
          <p className="lock-error" role="alert">
            {errorMsg}
          </p>
        )}

        <div className="lock-keypad">
          {KEYPAD_DIGITS.map((digit) => (
            <button
              key={digit}
              type="button"
              className="lock-key"
              onClick={() => handleDigitPress(digit)}
            >
              {digit}
            </button>
          ))}

          {mode === 'unlock' && biometricCredentialId ? (
            <button
              type="button"
              className="lock-key lock-key-bio"
              onClick={handleBiometricUnlock}
              disabled={biometricBusy}
              aria-label="Unlock with Face ID or Fingerprint"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 3H5C3.9 3 3 3.9 3 5V7M17 3H19C20.1 3 21 3.9 21 5V7M7 21H5C3.9 21 3 20.1 3 19V17M17 21H19C20.1 21 21 20.1 21 19V17M9 9V10.5M15 9V10.5M9.5 14.5C10.2 15.4 11 15.8 12 15.8C13 15.8 13.8 15.4 14.5 14.5M12 9V12.5H11"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : (
            <span className="lock-key-spacer" />
          )}

          <button
            type="button"
            className="lock-key"
            onClick={() => handleDigitPress('0')}
          >
            0
          </button>

          <button
            type="button"
            className="lock-key lock-key-back"
            onClick={handleBackspace}
            aria-label="Delete digit"
          >
            ⌫
          </button>
        </div>

        {mode === 'unlock' && onForgotLogout && (
          <button
            type="button"
            className="lock-forgot-btn"
            onClick={() => {
              triggerLightHaptic();
              onForgotLogout();
            }}
          >
            Forgot passcode? Log out
          </button>
        )}
      </div>
    </div>
  );
}
