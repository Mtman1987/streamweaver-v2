import { db } from './firebase-config';
import { collection, doc, getDoc, setDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { PointsService } from './points-service';

export interface RaidTrainSlot {
  date: string; // YYYY-MM-DD
  hour: number; // 0-23
  username?: string;
  displayName?: string;
  twitchId?: string;
  signedUpAt?: string;
  isEmergencySlot?: boolean;
  pointsCost?: number;
}

export interface RaidTrainSchedule {
  date: string;
  slots: RaidTrainSlot[];
}

export class RaidTrainService {
  private static instance: RaidTrainService;
  
  static getInstance(): RaidTrainService {
    if (!RaidTrainService.instance) {
      RaidTrainService.instance = new RaidTrainService();
    }
    return RaidTrainService.instance;
  }

  async getCurrentSlot(): Promise<RaidTrainSlot | null> {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const hour = now.getHours();
    
    const slotRef = doc(db, 'raidTrain', `${date}-${hour}`);
    const slotDoc = await getDoc(slotRef);
    
    if (slotDoc.exists()) {
      return slotDoc.data() as RaidTrainSlot;
    }
    
    return { date, hour };
  }

  async signUpForSlot(date: string, hour: number, userInfo: {
    username: string;
    displayName: string;
    twitchId: string;
  }): Promise<{ success: boolean; error?: string }> {
    const today = new Date().toISOString().split('T')[0];
    if (date === today) {
      throw new Error('Cannot sign up for same-day slots');
    }

    const slotRef = doc(db, 'raidTrain', `${date}-${hour}`);
    const slotDoc = await getDoc(slotRef);
    
    if (slotDoc.exists() && slotDoc.data()?.username) {
      return { success: false, error: 'Slot already taken' };
    }

    const isEmergencySlot = await this.isEmergencySlot(date, hour);
    const pointsCost = isEmergencySlot ? 
      parseInt(process.env.EMERGENCY_SLOT_COST || '50') : 
      parseInt(process.env.RAID_TRAIN_SLOT_COST || '100');

    const pointsService = PointsService.getInstance();
    const canAfford = await pointsService.deductPoints(userInfo.twitchId, pointsCost);
    
    if (!canAfford) {
      return { success: false, error: `Insufficient points. Need ${pointsCost} points.` };
    }

    await setDoc(slotRef, {
      date,
      hour,
      username: userInfo.username,
      displayName: userInfo.displayName,
      twitchId: userInfo.twitchId,
      signedUpAt: new Date().toISOString(),
      isEmergencySlot,
      pointsCost
    });

    return { success: true };
  }

  async cancelSlot(date: string, hour: number, twitchId: string): Promise<boolean> {
    const slotRef = doc(db, 'raidTrain', `${date}-${hour}`);
    const slotDoc = await getDoc(slotRef);
    
    if (!slotDoc.exists() || slotDoc.data()?.twitchId !== twitchId) {
      return false;
    }

    const slotData = slotDoc.data();
    if (slotData.pointsCost) {
      const pointsService = PointsService.getInstance();
      await pointsService.addPoints(
        twitchId, 
        slotData.username, 
        slotData.displayName, 
        slotData.pointsCost
      );
    }

    await setDoc(slotRef, { date, hour });
    return true;
  }

  async getScheduleForDate(date: string): Promise<RaidTrainSchedule> {
    const q = query(
      collection(db, 'raidTrain'),
      where('date', '==', date),
      orderBy('hour')
    );
    
    const querySnapshot = await getDocs(q);
    const slots: RaidTrainSlot[] = [];
    
    // Fill all 24 hours
    for (let hour = 0; hour < 24; hour++) {
      const existingSlot = querySnapshot.docs.find(doc => doc.data().hour === hour);
      if (existingSlot) {
        slots.push(existingSlot.data() as RaidTrainSlot);
      } else {
        slots.push({ date, hour });
      }
    }
    
    return { date, slots };
  }

  async isEmergencySlot(date: string, hour: number): Promise<boolean> {
    const now = new Date();
    const slotTime = new Date(`${date}T${hour.toString().padStart(2, '0')}:00:00`);
    const hoursUntilSlot = (slotTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    const lookaheadHours = parseInt(process.env.EMERGENCY_SLOTS_LOOKAHEAD_HOURS || '12');
    return hoursUntilSlot <= lookaheadHours && hoursUntilSlot > 0;
  }

  async getEmergencySlots(): Promise<RaidTrainSlot[]> {
    const now = new Date();
    const lookaheadHours = parseInt(process.env.EMERGENCY_SLOTS_LOOKAHEAD_HOURS || '12');
    const emergencySlots: RaidTrainSlot[] = [];
    
    for (let i = 1; i <= lookaheadHours; i++) {
      const futureTime = new Date(now.getTime() + (i * 60 * 60 * 1000));
      const date = futureTime.toISOString().split('T')[0];
      const hour = futureTime.getHours();
      
      const slotRef = doc(db, 'raidTrain', `${date}-${hour}`);
      const slotDoc = await getDoc(slotRef);
      
      if (!slotDoc.exists() || !slotDoc.data()?.username) {
        emergencySlots.push({
          date,
          hour,
          isEmergencySlot: true,
          pointsCost: parseInt(process.env.EMERGENCY_SLOT_COST || '50')
        });
      }
    }
    
    return emergencySlots;
  }

  generateDiscordEmbed(schedule: RaidTrainSchedule): any {
    const fields = [];
    const emergencySlots = await this.getEmergencySlots();
    
    for (let i = 0; i < schedule.slots.length; i += 8) {
      const hourSlots = schedule.slots.slice(i, i + 8);
      const fieldValue = hourSlots.map(slot => {
        const time = `${slot.hour.toString().padStart(2, '0')}:00`;
        const isEmergency = emergencySlots.some(e => e.date === slot.date && e.hour === slot.hour);
        const user = slot.username ? `@${slot.displayName || slot.username}` : 
          isEmergency ? '🚨 Emergency (50pts)' : '🚀 Open (100pts)';
        return `${time} - ${user}`;
      }).join('\n');
      
      fields.push({
        name: `Hours ${i}-${Math.min(i + 7, 23)}`,
        value: fieldValue,
        inline: true
      });
    }
    
    if (emergencySlots.length > 0) {
      fields.push({
        name: '🚨 Emergency Slots Available',
        value: `${emergencySlots.length} slots available at reduced cost (${process.env.EMERGENCY_SLOT_COST || 50} points)`,
        inline: false
      });
    }

    return {
      embeds: [{
        title: `🚂 Space Mountain Raid Train - ${schedule.date}`,
        description: 'All aboard the Space Mountain Express! Sign up for your time slot to join the raid train.\n\n**Points Cost:** Regular slots: 100pts | Emergency slots: 50pts',
        color: 0x9146FF,
        fields,
        footer: {
          text: 'Use the buttons below to sign up or cancel your slot'
        }
      }],
      components: [{
        type: 1,
        components: [
          {
            type: 2,
            style: 1,
            label: 'Sign Up',
            custom_id: 'raid_train_signup',
            emoji: { name: '🚂' }
          },
          {
            type: 2,
            style: 4,
            label: 'Cancel',
            custom_id: 'raid_train_cancel',
            emoji: { name: '❌' }
          }
        ]
      }]
    };
  }
}