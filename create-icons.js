const fs = require('fs');
const { createCanvas } = require('canvas');

// Create a simple icon for StreamWeave
function createIcon(size, filename) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Purple gradient background
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#8B5CF6');
    gradient.addColorStop(1, '#3B82F6');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // White border
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, size-4, size-4);
    
    // White text
    ctx.fillStyle = 'white';
    ctx.font = `bold ${size/8}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SW', size/2, size/2 - size/16);
    
    // Subtitle
    ctx.font = `${size/16}px Arial`;
    ctx.fillText('StreamWeave', size/2, size/2 + size/8);
    
    // Save as PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`assets/${filename}`, buffer);
    console.log(`Created ${filename}`);
}

// Create icons
createIcon(256, 'app-icon.png');
createIcon(64, 'tray-icon.png');