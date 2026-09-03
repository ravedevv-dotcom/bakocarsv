/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Car } from './types';
import { SHOWROOM_VEHICLES } from './data';

const VEHICLES_COLLECTION = 'vehicles';

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

        // Merge or replace: if firestore has cars, prioritize them and append any missing default cars
        const existingIds = new Set(firestoreCars.map((c) => c.id));
        const merged = [...firestoreCars];
        for (const defaultCar of SHOWROOM_VEHICLES) {
          if (!existingIds.has(defaultCar.id)) {
            merged.push(defaultCar);
          }
        }

        onUpdate(merged);
      },
      (error) => {
        console.warn('Firestore subscription fallback to local dataset:', error);
        onUpdate(SHOWROOM_VEHICLES);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to initialize Firestore listener, using local data:', err);
    onUpdate(SHOWROOM_VEHICLES);
    return () => {};
  }
}

export async function saveVehicle(car: Car): Promise<void> {
  try {
    const docRef = doc(db, VEHICLES_COLLECTION, car.id);
    await setDoc(docRef, car, { merge: true });
  } catch (error) {
    console.error('Error saving vehicle to Firestore:', error);
    throw error;
  }
}

export async function updateVehicleStatus(carId: string, status: Car['status']): Promise<void> {
  try {
    const docRef = doc(db, VEHICLES_COLLECTION, carId);
    await updateDoc(docRef, { status });
  } catch (error) {
    console.error('Error updating vehicle status:', error);
    throw error;
  }
}

export async function deleteVehicle(carId: string): Promise<void> {
  try {
    const docRef = doc(db, VEHICLES_COLLECTION, carId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    throw error;
  }
}
