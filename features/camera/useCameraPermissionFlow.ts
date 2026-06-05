import { useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking } from 'react-native';

export function useCameraPermissionFlow() {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPermissionAsked, setCameraPermissionAsked] = useState(false);

  const activateCamera = useCallback(() => {
    setCameraActive(true);
  }, []);

  const deactivateCamera = useCallback(() => {
    setCameraActive(false);
  }, []);

  const requestCameraAccess = useCallback(async () => {
    const result = await requestPermission();
    if (!result.granted) {
      deactivateCamera();
      return false;
    }

    activateCamera();
    return true;
  }, [activateCamera, deactivateCamera, requestPermission]);

  const handlePermissionAction = useCallback(async () => {
    if (permission?.canAskAgain === false) {
      await Linking.openSettings();
      return;
    }

    await requestCameraAccess();
  }, [permission?.canAskAgain, requestCameraAccess]);

  useFocusEffect(
    useCallback(() => {
      if (!permission) return undefined;

      if (permission.granted) {
        activateCamera();
      } else {
        deactivateCamera();
        if (!cameraPermissionAsked && permission.canAskAgain) {
          setCameraPermissionAsked(true);
          void requestCameraAccess();
        }
      }

      return deactivateCamera;
    }, [
      activateCamera,
      cameraPermissionAsked,
      deactivateCamera,
      permission,
      requestCameraAccess,
    ]),
  );

  return {
    activateCamera,
    cameraActive,
    deactivateCamera,
    handlePermissionAction,
    permission,
  };
}
