const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

const oldLogoHTML1 = `<a href="index.html" class="logo custom-logo">
                <img src="assets/ajhggc_logo.png" alt="AJHGGC Logo" class="custom-logo-img">
            </a>`;
const oldLogoHTML2 = `<a href="index.html" class="logo custom-logo">
                    <img src="assets/ajhggc_logo.png" alt="AJHGGC Logo" class="custom-logo-img">
                </a>`;
const oldLogoHTML3 = `<a href="#" class="sidebar-logo custom-logo">
                    <img src="assets/ajhggc_logo.png" alt="AJHGGC Logo" class="custom-logo-img">
                </a>`;
                
const newAurexLogoFront = `<a href="index.html" class="aurex-logo">
                <div class="aurex-icon"></div>
                Aurex
            </a>`;
const newAurexLogoFrontIndented = `<a href="index.html" class="aurex-logo">
                    <div class="aurex-icon"></div>
                    Aurex
                </a>`;
const newAurexLogoSidebar = `<a href="#" class="sidebar-logo aurex-logo" style="margin-bottom: 20px;">
                    <div class="aurex-icon"></div>
                    Aurex
                </a>`;

files.forEach(file => {
    let content = fs.readFileSync(path.join(publicDir, file), 'utf8');
    
    // Replace custom text occurrences
    content = content.replace(/NexusBank/g, 'Aurex');
    content = content.replace(/nexusbank\.com/g, 'aurex.com');
    content = content.replace(/<span>Aurex<\/span>/g, '<span class="aurex-logo" style="justify-content:center;"><div class="aurex-icon"></div>Aurex</span>');
    
    // Replace the specific image blocks
    content = content.replace(oldLogoHTML1, newAurexLogoFront);
    content = content.replace(oldLogoHTML2, newAurexLogoFrontIndented);
    content = content.replace(oldLogoHTML3, newAurexLogoSidebar);
    
    fs.writeFileSync(path.join(publicDir, file), content);
    console.log(`Updated ${file}`);
});
