const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 1024 * 1024 }, // 1MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Ensure skins directory exists
const skinsDir = path.join(__dirname, '../public/skins');
async function ensureSkinsDir() {
  try {
    await fs.access(skinsDir);
  } catch {
    await fs.mkdir(skinsDir, { recursive: true });
    await fs.mkdir(path.join(skinsDir, 'default'), { recursive: true });
  }
}
ensureSkinsDir();

// Create default Steve skin images
async function createDefaultSkins() {
  const defaultDir = path.join(skinsDir, 'default');
  
  // Create simple default head (32x32 brown square)
  const defaultHead = sharp({
    create: {
      width: 32,
      height: 32,
      channels: 4,
      background: { r: 139, g: 69, b: 19, alpha: 1 }
    }
  }).png();
  
  // Create simple default front view (64x64)
  const defaultFront = sharp({
    create: {
      width: 64,
      height: 64,
      channels: 4,
      background: { r: 139, g: 69, b: 19, alpha: 1 }
    }
  }).png();
  
  try {
    await defaultHead.toFile(path.join(defaultDir, 'head.png'));
    await defaultFront.toFile(path.join(defaultDir, 'front.png'));
  } catch (error) {
    console.error('Error creating default skins:', error);
  }
}
createDefaultSkins();

// Download skin from external APIs
async function downloadSkinFromAPIs(username) {
  const sources = [
    `${process.env.MINOTAR_API_URL || 'https://minotar.net'}/skin/${username}`,
    `${process.env.CRAFATAR_API_URL || 'https://crafatar.com'}/skins/${username}?default=MHF_Steve`,
    `${process.env.MCHEADS_API_URL || 'https://mc-heads.net'}/skin/${username}`
  ];
  
  for (const url of sources) {
    try {
      const response = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 5000
      });
      
      if (response.status === 200 && response.data.length > 0) {
        return Buffer.from(response.data);
      }
    } catch (error) {
      console.log(`Failed to download from ${url}:`, error.message);
      continue;
    }
  }
  
  return null;
}

// Extract player head from skin (8x8 face area from 64x64 skin)
async function extractPlayerHead(skinBuffer) {
  try {
    // Extract the face area (8x8 pixels) from position (8,8) in the skin
    const faceBuffer = await sharp(skinBuffer)
      .extract({ left: 8, top: 8, width: 8, height: 8 })
      .resize(32, 32, { kernel: 'nearest' }) // Scale up with nearest neighbor
      .png()
      .toBuffer();
    
    return faceBuffer;
  } catch (error) {
    console.error('Error extracting head:', error);
    return null;
  }
}

// Create front view of player (simplified version)
async function createPlayerFrontView(skinBuffer) {
  try {
    // For now, just resize the head to 64x64 as a placeholder
    // In a full implementation, this would combine head, body, arms, legs
    const frontBuffer = await sharp(skinBuffer)
      .extract({ left: 8, top: 8, width: 8, height: 8 })
      .resize(64, 64, { kernel: 'nearest' })
      .png()
      .toBuffer();
    
    return frontBuffer;
  } catch (error) {
    console.error('Error creating front view:', error);
    return null;
  }
}

// Upload skin endpoint
router.post('/:username/upload', upload.single('skin'), async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    let skinBuffer;
    
    if (req.file) {
      // Use uploaded skin
      skinBuffer = req.file.buffer;
    } else {
      // Try to download from external APIs
      skinBuffer = await downloadSkinFromAPIs(username);
      
      if (!skinBuffer) {
        return res.status(404).json({ error: 'Skin not found' });
      }
    }
    
    // Create user directory
    const userDir = path.join(skinsDir, username);
    await fs.mkdir(userDir, { recursive: true });
    
    // Extract head and create front view
    const headBuffer = await extractPlayerHead(skinBuffer);
    const frontBuffer = await createPlayerFrontView(skinBuffer);
    
    if (headBuffer && frontBuffer) {
      // Save processed images
      await fs.writeFile(path.join(userDir, 'head.png'), headBuffer);
      await fs.writeFile(path.join(userDir, 'front.png'), frontBuffer);
      
      res.json({ 
        success: true,
        headUrl: `/skins/${username}/head.png`,
        frontUrl: `/skins/${username}/front.png`
      });
    } else {
      res.status(500).json({ error: 'Failed to process skin' });
    }
    
  } catch (error) {
    console.error('Skin upload error:', error);
    res.status(500).json({ error: 'Failed to upload skin' });
  }
});

// Get skin endpoint
router.get('/:username/:type', async (req, res) => {
  try {
    const { username, type } = req.params;
    
    if (!['head', 'front'].includes(type)) {
      return res.status(400).json({ error: 'Invalid skin type. Use "head" or "front"' });
    }
    
    const skinPath = path.join(skinsDir, username, `${type}.png`);
    const defaultPath = path.join(skinsDir, 'default', `${type}.png`);
    
    try {
      // Try to serve user's skin
      await fs.access(skinPath);
      res.sendFile(path.resolve(skinPath));
    } catch {
      // Fallback to default skin
      try {
        await fs.access(defaultPath);
        res.sendFile(path.resolve(defaultPath));
      } catch {
        res.status(404).json({ error: 'Skin not found' });
      }
    }
    
  } catch (error) {
    console.error('Get skin error:', error);
    res.status(500).json({ error: 'Failed to get skin' });
  }
});

// Auto-download skin for username
router.post('/:username/download', async (req, res) => {
  try {
    const { username } = req.params;
    
    const skinBuffer = await downloadSkinFromAPIs(username);
    
    if (skinBuffer) {
      // Process and save the skin
      const userDir = path.join(skinsDir, username);
      await fs.mkdir(userDir, { recursive: true });
      
      const headBuffer = await extractPlayerHead(skinBuffer);
      const frontBuffer = await createPlayerFrontView(skinBuffer);
      
      if (headBuffer && frontBuffer) {
        await fs.writeFile(path.join(userDir, 'head.png'), headBuffer);
        await fs.writeFile(path.join(userDir, 'front.png'), frontBuffer);
        
        res.json({ 
          success: true,
          message: 'Skin downloaded and processed',
          headUrl: `/skins/${username}/head.png`,
          frontUrl: `/skins/${username}/front.png`
        });
      } else {
        res.status(500).json({ error: 'Failed to process downloaded skin' });
      }
    } else {
      res.status(404).json({ error: 'Skin not found in any source' });
    }
    
  } catch (error) {
    console.error('Skin download error:', error);
    res.status(500).json({ error: 'Failed to download skin' });
  }
});

module.exports = router;