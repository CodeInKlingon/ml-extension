// Test script to verify song parsing logic
// Run this with Node.js to test the parsing functions

const fs = require('fs');

// Mock DOMParser for Node.js environment
global.DOMParser = class {
  parseFromString(html, type) {
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM(html);
    return dom.window.document;
  }
};

// Copy the parsing functions from the background script
function parseSongsFromHtml(html, round, leagueId) {
  const songs = [];
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Look for song cards - each song is in a card with a Spotify track ID
  const songCards = doc.querySelectorAll('.card[id^="spotify:track:"]');
  
  songCards.forEach((card, index) => {
    const songId = card.id || `song_${round.id}_${index}`;
    
    // Extract song title from the card-title link
    const titleElement = card.querySelector('.card-title a');
    const title = titleElement?.textContent?.trim() || 'Unknown Title';
    
    // Extract artist from the first card-text paragraph (after the title)
    const cardTexts = card.querySelectorAll('.card-text');
    let artist = 'Unknown Artist';
    if (cardTexts.length > 0) {
      // The first card-text is usually the artist
      artist = cardTexts[0].textContent?.trim() || 'Unknown Artist';
    }
    
    // Extract submitter from the ranking section
    const submitterElement = card.querySelector('.fw-semibold');
    const submittedBy = submitterElement?.textContent?.trim() || 'Unknown User';
    
    songs.push({
      id: songId,
      title,
      artist,
      submittedBy,
      roundId: round.id,
      roundName: round.name,
      leagueId,
      leagueName: 'Music League',
      url: `https://app.musicleague.com/l/${leagueId}/${round.id}/-/results`
    });
  });
  
  return songs;
}

// Test the parsing
try {
  const html = fs.readFileSync('results.html', 'utf8');
  const mockRound = {
    id: '68975cc16c4345aaa020aed523f961bf',
    name: 'Best of Music League',
    songs: []
  };
  
  const songs = parseSongsFromHtml(html, mockRound, 'a0cf5068a0ad43cfa7a9a26cf2dff1ce');
  
  console.log('Found songs:');
  songs.forEach((song, index) => {
    console.log(`${index + 1}. "${song.title}" by ${song.artist} (submitted by ${song.submittedBy})`);
  });
  
  console.log(`\nTotal songs found: ${songs.length}`);
  
  // Show first few songs in detail
  console.log('\nFirst 5 songs:');
  songs.slice(0, 5).forEach(song => {
    console.log(`- "${song.title}" by ${song.artist} (submitted by ${song.submittedBy})`);
  });
  
} catch (error) {
  console.error('Error testing song parsing:', error);
} 