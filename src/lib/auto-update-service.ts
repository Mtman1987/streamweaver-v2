import { db } from './firebase-config';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { TwitchStreamTracker } from './twitch-stream-tracker';

export class AutoUpdateService {
  private static instance: AutoUpdateService;
  
  static getInstance(): AutoUpdateService {
    if (!AutoUpdateService.instance) {
      AutoUpdateService.instance = new AutoUpdateService();
    }
    return AutoUpdateService.instance;
  }

  // Event-driven updates for data changes
  setupDataTriggers(): void {
    // Calendar updates when events change
    onSnapshot(collection(db, 'calendarEvents'), () => {
      this.updateCalendarChannel();
    });

    // Raid train updates when slots change
    onSnapshot(collection(db, 'raidTrain'), () => {
      this.updateRaidTrainChannel();
    });
  }

  // Timer-based updates (every 10 minutes) for shoutouts
  startTimerUpdates(): void {
    setInterval(() => {
      this.updateVIPShoutouts();
      this.updateCommunityShoutouts();
    }, 10 * 60 * 1000); // 10 minutes
  }

  // Hourly raid train holder update
  startHourlyRaidTrainUpdate(): void {
    setInterval(() => {
      this.updateRaidTrainHolder();
    }, 60 * 60 * 1000); // 1 hour
  }

  private async updateCalendarChannel(): Promise<void> {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/calendar/update-channel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.BOT_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error updating calendar channel:', error);
    }
  }



  private async updateRaidTrainChannel(): Promise<void> {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/discord/raid-train-channel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.BOT_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channelId: process.env.DISCORD_RAID_TRAIN_CHANNEL_ID,
          date: new Date().toISOString().split('T')[0]
        })
      });
    } catch (error) {
      console.error('Error updating raid train channel:', error);
    }
  }



  private async updateRaidTrainHolder(): Promise<void> {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/raid-train/update-holder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.BOT_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error updating raid train holder:', error);
    }
  }

  private async updateVIPShoutouts(): Promise<void> {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/vip/update-shoutouts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.BOT_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error updating VIP shoutouts:', error);
    }
  }



  private async updateCommunityShoutouts(): Promise<void> {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/community/update-shoutouts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.BOT_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error updating community shoutouts:', error);
    }
  }
}