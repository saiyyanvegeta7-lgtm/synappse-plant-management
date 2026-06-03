import { db, handleFirestoreError, OperationType } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface GlobalSettings {
  plant_ops_workflow_web_app_url?: string;
  plant_ops_spreadsheet_id?: string;
  plant_ops_spreadsheet_name?: string;
  plant_ops_spreadsheet_url?: string;
}

const SETTINGS_COLLECTION = 'settings';
const GLOBAL_DOC_ID = 'global';

export const SettingsService = {
  /**
   * Fetch global settings once from firestore
   */
  async getGlobalSettings(): Promise<GlobalSettings | null> {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, GLOBAL_DOC_ID);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as GlobalSettings;
        // Sync to localStorage for backwards compatibility with any synchronous modules
        this.syncToLocalStorage(data);
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching global settings:', error);
      return null;
    }
  },

  /**
   * Save or merge global settings in firestore
   */
  async saveGlobalSettings(settings: Partial<GlobalSettings>): Promise<void> {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, GLOBAL_DOC_ID);
      await setDoc(docRef, settings, { merge: true });
      
      // Keep localStorage in sync
      const current = await this.getGlobalSettings() || {};
      const merged = { ...current, ...settings };
      this.syncToLocalStorage(merged);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/${GLOBAL_DOC_ID}`);
    }
  },

  /**
   * Subscribe to real-time updates of global settings
   */
  subscribeToGlobalSettings(onUpdate: (settings: GlobalSettings) => void) {
    const docRef = doc(db, SETTINGS_COLLECTION, GLOBAL_DOC_ID);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as GlobalSettings;
        this.syncToLocalStorage(data);
        onUpdate(data);
      }
    }, (error) => {
      console.error('Error listening to global settings:', error);
    });
  },

  /**
   * Helper to write back to legacy localStorage for instant backwards compatibility
   */
  syncToLocalStorage(settings: GlobalSettings) {
    if (settings.plant_ops_workflow_web_app_url !== undefined) {
      localStorage.setItem('plant_ops_workflow_web_app_url', settings.plant_ops_workflow_web_app_url || '');
    }
    if (settings.plant_ops_spreadsheet_id !== undefined) {
      localStorage.setItem('plant_ops_spreadsheet_id', settings.plant_ops_spreadsheet_id || '');
    }
    if (settings.plant_ops_spreadsheet_name !== undefined) {
      localStorage.setItem('plant_ops_spreadsheet_name', settings.plant_ops_spreadsheet_name || '');
    }
    if (settings.plant_ops_spreadsheet_url !== undefined) {
      localStorage.setItem('plant_ops_spreadsheet_url', settings.plant_ops_spreadsheet_url || '');
    }
  }
};
