// Test script to verify HTML parsing logic
// Run this with Node.js to test the parsing functions

const fs = require('fs');

// Mock DOMParser for Node.js environment
global.DOMParser = class {
  parseFromString(html, type) {
    // Simple HTML parser for testing
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM(html);
    return dom.window.document;
  }
};

// Copy the parsing functions from the background script
function parseRoundsFromHtml(html, leagueId) {
  const rounds = [];
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const roundElements = doc.querySelectorAll('.league-round-item');
  
  roundElements.forEach((element) => {
    const roundId = element.id;
    const titleElement = element.querySelector('.card-title');
    const roundName = titleElement?.textContent?.trim() || 'Unknown Round';
    
    if (roundId) {
      rounds.push({
        id: roundId,
        name: roundName,
        songs: []
      });
    }
  });
  
  return rounds;
}

// Test the parsing
try {
  const html = fs.readFileSync('rounds.html', 'utf8');
  const rounds = parseRoundsFromHtml(html, 'a0cf5068a0ad43cfa7a9a26cf2dff1ce');
  
  console.log('Found rounds:');
  rounds.forEach((round, index) => {
    console.log(`${index + 1}. ${round.name} (ID: ${round.id})`);
  });
  
  console.log(`\nTotal rounds found: ${rounds.length}`);
  
  // Show first few rounds in detail
  console.log('\nFirst 3 rounds:');
  rounds.slice(0, 3).forEach(round => {
    console.log(`- ${round.name} (${round.id})`);
  });
  
} catch (error) {
  console.error('Error testing parsing:', error);
} 