/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { Car } from './types';
import { SHOWROOM_VEHICLES } from './data';

const VEHICLES_COLLECTION = 'vehicles';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function subscribeToVehicles(onUpdate: (vehicles: Car[]) => void) {
  try {
    const colRef = collection(db, VEHICLES_COLLECTION);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        if (snapshot.empty) {
          onUpdate(SHOWROOM_VEHICLES);
          return;
        }

        const firestoreCars: Car[] = [];
        snapshot.forEach((docSnap) => {
          firestoreCars.push({ id: docSnap.id, ...docSnap.data() } as Car);
        });

        const defaultCarMap = new Map(SHOWROOM_VEHICLES.map((c) => [c.id, c]));
        const merged: Car[] = [];
        const seenIds = new Set<string>();

        firestoreCars.forEach((fCar) => {
          seenIds.add(fCar.id);
          const defaultCar = defaultCarMap.get(fCar.id);
          if (defaultCar) {
            // Keep status/user edits from Firestore, but preserve full showroom images if Firestore has fewer
            const defaultImgs = defaultCar.images || [];
            const firestoreImgs = fCar.images || [];
            const images =
              firestoreImgs.length >= defaultImgs.length && firestoreImgs.length > 0
                ? firestoreImgs
                : defaultImgs;

            merged.push({
              ...defaultCar,
              ...fCar,
              images,
            });
          } else {
            merged.push(fCar);
          }
        });

        for (const defaultCar of SHOWROOM_VEHICLES) {
          if (!seenIds.has(defaultCar.id)) {
            merged.push(defaultCar);
          }
        }

        onUpdate(merged);
      },
      (error) => {
        const errorMsg = error?.message || String(error);
        if (errorMsg.includes('Missing or insufficient permissions')) {
          handleFirestoreError(error, OperationType.GET, VEHICLES_COLLECTION);
        } else {
          // Gracefully fallback to showroom inventory for offline / transient connection drops
          console.warn('Firestore subscription fallback to local dataset:', errorMsg);
          onUpdate(SHOWROOM_VEHICLES);
        }
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.warn('Failed to initialize Firestore listener, using local data:', err?.message || String(err));
    onUpdate(SHOWROOM_VEHICLES);
    return () => {};
  }
}

export async function saveVehicle(car: Car): Promise<void> {
  const path = `${VEHICLES_COLLECTION}/${car.id}`;
  try {
    const docRef = doc(db, VEHICLES_COLLECTION, car.id);
    await setDoc(docRef, car, { merge: true });
  } catch (error: any) {
    if (error?.message?.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
    console.error('Error saving vehicle to Firestore:', error?.message || String(error));
    throw error;
  }
}

export async function updateVehicleStatus(carId: string, status: Car['status']): Promise<void> {
  const path = `${VEHICLES_COLLECTION}/${carId}`;
  try {
    const docRef = doc(db, VEHICLES_COLLECTION, carId);
    await updateDoc(docRef, { status });
  } catch (error: any) {
    if (error?.message?.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    console.error('Error updating vehicle status:', error?.message || String(error));
    throw error;
  }
}

export async function deleteVehicle(carId: string): Promise<void> {
  const path = `${VEHICLES_COLLECTION}/${carId}`;
  try {
    const docRef = doc(db, VEHICLES_COLLECTION, carId);
    await deleteDoc(docRef);
  } catch (error: any) {
    if (error?.message?.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
    console.error('Error deleting vehicle:', error?.message || String(error));
    throw error;
  }
}
