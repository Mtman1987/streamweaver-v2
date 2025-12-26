export interface SimpleShoutoutInput {
  username: string;
  personality?: string;
}

export interface SimpleShoutoutOutput {
  shoutout: string;
}

export async function simpleShoutout(input: SimpleShoutoutInput): Promise<SimpleShoutoutOutput> {
  const { username, personality } = input;
  
  // High-energy template-based shoutout generation
  const templates = [
    `🔥 MASSIVE SHOUTOUT to ${username}! 🔥 This legend is absolutely crushing it over at https://twitch.tv/${username} - GO SHOW THEM SOME LOVE RIGHT NOW! 💜`,
    `⚡ ATTENTION CHAT! ⚡ ${username} is doing INCREDIBLE things at https://twitch.tv/${username} - seriously, drop everything and check them out! They deserve ALL the follows! 🚀`,
    `🎉 HYPE TRAIN INCOMING! 🎉 ${username} is absolutely KILLING IT with their content! Everyone needs to hit up https://twitch.tv/${username} and witness greatness! 💪`,
    `🌟 STAR ALERT! 🌟 ${username} is out here being absolutely PHENOMENAL! Race over to https://twitch.tv/${username} and prepare to be AMAZED! This is NOT a drill! 🔥💜`
  ];
  
  // If personality includes space/sci-fi themes, use themed templates
  if (personality && (personality.toLowerCase().includes('athena') || 
                     personality.toLowerCase().includes('space') || 
                     personality.toLowerCase().includes('commander'))) {
    const spaceTemplates = [
      `🚀 COMMANDER! Priority transmission from Captain ${username}! Their stellar content is OFF THE CHARTS at https://twitch.tv/${username} - ALL HANDS, ENGAGE MAXIMUM HYPE! ⚡`,
      `🌟 RED ALERT! Captain ${username} is broadcasting LEGENDARY content from their command bridge at https://twitch.tv/${username} - prepare for MIND-BLOWING entertainment! 🔥`,
      `⚡ SCANNING... INCREDIBLE content detected! Captain ${username} at https://twitch.tv/${username} is operating at MAXIMUM AWESOME - setting course for EPIC STREAMS! 🚀`,
      `🎯 BRIDGE TO ALL STATIONS! Captain ${username} needs our FULL SUPPORT at https://twitch.tv/${username} - deploy ALL the follows and unleash the HYPE CANNONS! 💜🔥`
    ];
    const randomTemplate = spaceTemplates[Math.floor(Math.random() * spaceTemplates.length)];
    return { shoutout: randomTemplate };
  }
  
  // Default random template
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  return { shoutout: randomTemplate };
}