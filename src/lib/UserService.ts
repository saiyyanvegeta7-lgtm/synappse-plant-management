import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, doc, updateDoc, getDocs, setDoc } from 'firebase/firestore';
import { UserProfile } from '../types';

const COLLECTION = 'users';

export const UserService = {
  /**
   * Subscribe to real-time changes of all user profiles in the system
   */
  subscribeToUsers(onUpdate: (users: UserProfile[]) => void, onError?: (err: any) => void) {
    const colRef = collection(db, COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const users: UserProfile[] = [];
        snapshot.forEach((doc) => {
          users.push(doc.data() as UserProfile);
        });
        onUpdate(users);
      },
      (error) => {
        console.error('Error fetching users collection:', error);
        if (onError) onError(error);
      }
    );
  },

  /**
   * Fetch a snapshot list of all users
   */
  async getAllUsers(): Promise<UserProfile[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION));
      const users: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        users.push(doc.data() as UserProfile);
      });
      return users;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTION);
      return [];
    }
  },

  /**
   * Update another user's role, department, and approval level
   */
  async updateUserRoleAndHierarchy(
    targetUid: string,
    updates: Partial<UserProfile>
  ): Promise<void> {
    try {
      const userRef = doc(db, COLLECTION, targetUid);
      await updateDoc(userRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${targetUid}`);
    }
  }
};
