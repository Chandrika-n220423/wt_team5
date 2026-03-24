const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

const aurexLogoFront = `<a href="index.html" class="aurex-logo">
                <div class="aurex-icon"></div>
                Aurex
            </a>`;
const aurexLogoFrontIndented = `<a href="index.html" class="aurex-logo">
                    <div class="aurex-icon"></div>
                    Aurex
                </a>`;
const aurexLogoSidebar = `<a href="#" class="sidebar-logo aurex-logo" style="margin-bottom: 20px;">
                    <div class="aurex-icon"></div>
                    Aurex
                </a>`;

const oldLogoHTML1 = `<a href="index.html" class="logo custom-logo">
                <img src="assets/ajhggc_logo.png" alt="AJHGGC Logo" class="custom-logo-img">
            </a>`;
const oldLogoHTML2 = `<a href="index.html" class="logo custom-logo">
                    <img src="assets/ajhggc_logo.png" alt="AJHGGC Logo" class="custom-logo-img">
                </a>`;
const oldLogoHTML3 = `<a href="#" class="sidebar-logo custom-logo">
                    <img src="assets/ajhggc_logo.png" alt="AJHGGC Logo" class="custom-logo-img">
                </a>`;

files.forEach(file => {
    let content = fs.readFileSync(path.join(publicDir, file), 'utf8');
    
    // Specifically looking for the aurex-logo blocks we inserted last time
    content = content.replace(aurexLogoFront, oldLogoHTML1);
    content = content.replace(aurexLogoFrontIndented, oldLogoHTML2);
    content = content.replace(aurexLogoSidebar, oldLogoHTML3);
    
    // Replace auth page inline logos back to the custom-logo format but maybe keep Aurex text?
    // User said "keep the previous logo safe and remain as it is i want that one"
    // Let's restore the exact auth page logo if needed, but previously auth pages were just <span>NexusBank</span>. We changed it to <span class="aurex-logo">...</span>
    // Let's replace the inline aurex-logo span back to normal span with Aurex, or maybe an image.
    content = content.replace(/<span class="aurex-logo" style="justify-content:center;"><div class="aurex-icon"><\/div>Aurex<\/span>/g, '<img src="assets/ajhggc_logo.png" alt="Logo" class="custom-logo-img" style="height: 48px; margin: 0 auto;">');
    
    fs.writeFileSync(path.join(publicDir, file), content);
    console.log(`Restored logos in ${file}`);
});
