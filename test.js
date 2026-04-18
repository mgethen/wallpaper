const fs = require('fs');
const path = require('path');
const binary = fs.readFileSync('c:\\Users\\Michael Gethen\\Documents\\GitHub\\wallpaper\\node_modules\\wallpaper\\source\\windows-wallpaper-x86-64.exe', 'utf8');
const hasScreen = binary.includes('--screen');
const hasAll = binary.includes('all');
fs.writeFileSync('c:\\Users\\Michael Gethen\\Documents\\GitHub\\wallpaper\\scratch_result.txt', `hasScreen: ${hasScreen}, hasAll: ${hasAll}`);
