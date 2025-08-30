/**
 * Name matching logic from Henry Goodman's yahoo fantasy football extension
 * 
 * Link: https://github.com/hgoodman/yahoo-pre-draft/tree/master
 *
 * Original license:
 *
 * The MIT License (MIT)
 * =====================
 *
 * Copyright (c) 2016-2017 Henry Goodman
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const NameMatcher = (function() {
  // ASCII to diacritic mapping (from Yahoo extension)
  const asciiToDiacritic = {
    'A': 'ÀÁÂÄÃÅĀ', 'AE': 'Æ',
    'C': 'ÇĆČ', 'E': 'ÈÉÊËĒĖĘ',
    'I': 'ÎÏÍĪĮÌ', 'L': 'Ł',
    'N': 'ÑŃ', 'O': 'ÔÖÒÓØŌÕ',
    'OE': 'Œ', 'S': 'ŚŠ',
    'U': 'ÛÜÙÚŪ', 'Y': 'Ÿ',
    'Z': 'ŽŹŻ', 'a': 'àáâäãå',
    'ae': 'æ', 'c': 'çćč',
    'e': 'èéêëēėę', 'i': 'îïíīįì',
    'l': 'ł', 'n': 'ñń',
    'o': 'ôöòóøōõ', 'oe': 'œ',
    's': 'śš', 'ss': 'ß',
    'u': 'ûüùúū', 'y': 'ÿ',
    'z': 'žźż'
  };

  const asciiLookup = {};
  for (const ascii in asciiToDiacritic) {
    const diacritic = asciiToDiacritic[ascii];
    for (let i = 0; i < diacritic.length; i++) {
      asciiLookup[diacritic[i]] = ascii;
    }
  }

  const asciiFold = function(str) {
    return str.replace(/[^\u0000-\u007f]/g, function(match) {
      return asciiLookup[match] || match;
    });
  };

  // Common first name patterns (from Yahoo extension)
  const firstNamePatterns = [
    /^Alex(ander)? /i,
    /^Ben(jamin)? /i,
    /^Brad(ley)? /i,
    /^Cam(eron)? /i,
    /^Chris(topher)? /i,
    /^Dan(iel)? /i,
    /^Dav(e|id) /i,
    /^Greg(ory)? /i,
    /^Ja(ke|[ck]ob) /i,
    /^Jo(e|seph) /i,
    /^Jon(athan)? /i,
    /^Josh(ua)? /i,
    /^Ken(neth)? /i,
    /^Matt(hew)? /i,
    /^Mi(ke|chael) /i,
    /^Mitch(ell)? /i,
    /^Nat(e|han) /i,
    /^Nic(ky?|holas) /i,
    /^Nori(chika)? /i,
    /^Rob(ert)? /i,
    /^Ste(vi?e|phen) /i,
    /^Vince(nt)? /i,
    /^Wil(l(iam)?)? /i,
    /^Yuli(eski)? /i
  ];

  // Manual regex overrides (from Yahoo extension)
  const nameRegexes = {
    'Corey Brown': /^(Corey|Philly) Brown/i,
    'Pierre-Alexandr Parenteau': /^Pierre-Alexandre? Parenteau/i,
    'Carl Edwards Jr.': /^(Carl|C\.J\.) Edwards( Jr\.)?/i,
    'Adalberto Mondesi': /^(Raul )?Adalberto Mondesi/i,
    'Michael A. Taylor': /^Michael (A\. )?Taylor/i,
    'Mychal Givens': /^Mychal (Antonio )?Givens/i
  };

  const nameToRegex = function(name) {
    if (!nameRegexes[name]) {
      let pattern = name.replace(/([\-\.])/g, '[ \\$1]?');
      let matched = false;
      
      for (const f of firstNamePatterns) {
        if (pattern.match(f)) {
          pattern = pattern.replace(f, f.source);
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        pattern = '^' + pattern;
      }
      
      nameRegexes[name] = new RegExp(pattern, 'i');
    }
    
    return nameRegexes[name];
  };

  return {
    /**
     * Core name matching function adapted from Yahoo extension.
     * Uses advanced regex patterns and diacritic folding for robust name matching.
     * 
     * @param {string} n0 - First name to compare
     * @param {string} n1 - Second name to compare
     * @returns {boolean} True if names match, false otherwise
     */
    namesMatch: function(n0, n1) {
      n0 = asciiFold(n0);
      n1 = asciiFold(n1);
      
      if (n0.match(nameToRegex(n1))) {
        return true;
      }
      
      if (n1.match(nameToRegex(n0))) {
        return true;
      }
      
      return false;
    },

    /**
     * Enhanced matching for Sleeper player objects with filtering and confidence scoring.
     * Searches through player database and returns matches sorted by confidence.
     * 
     * @param {string} searchName - Name to search for
     * @param {Object} players - Player database object
     * @param {Object} [options={}] - Search options
     * @param {boolean} [options.requireActive=true] - Only include active players
     * @param {boolean} [options.preferActive=false] - Prefer active players in results
     * @param {Array} [options.preferredPositions=null] - Array of preferred positions
     * @param {boolean} [options.requirePosition=false] - Require position match
     * @returns {Array} Array of matching players with confidence scores
     */
    findPlayerMatches: function(searchName, players, options = {}) {
      const {
        requireActive = true,
        preferActive = false,
        preferredPositions = null,
        requirePosition = false
      } = options;

      const matches = [];
      
      for (const [playerId, player] of Object.entries(players)) {
        // Skip players without required data
        if (!player.first_name || !player.last_name) continue;
        
        // Filter by active status (hard requirement)
        if (requireActive && player.status !== 'Active') continue;
        
        // Filter by position if specified
        if (requirePosition && preferredPositions && 
            !preferredPositions.includes(player.position)) continue;

        const fullName = `${player.first_name} ${player.last_name}`;
        
        if (this.namesMatch(searchName, fullName)) {
          matches.push({
            ...player,
            playerId,
            fullName,
            confidence: this.calculateConfidence(searchName, fullName, player)
          });
        }
      }

      // Sort by confidence score, with optional preference for active players
      return matches.sort((a, b) => {
        // If preferActive is enabled, prioritize active players over inactive
        if (preferActive && a.status !== b.status) {
          if (a.status === 'Active' && b.status !== 'Active') return -1;
          if (b.status === 'Active' && a.status !== 'Active') return 1;
        }
        // Otherwise sort by confidence score
        return b.confidence - a.confidence;
      });
    },

    /**
     * Calculate confidence score for a name match based on various factors.
     * 
     * @param {string} searchName - Original search name
     * @param {string} playerName - Matched player's full name
     * @param {Object} playerData - Player data object
     * @returns {number} Confidence score between 0 and 1
     */
    calculateConfidence: function(searchName, playerName, playerData) {
      let confidence = 0.5; // Base confidence
      
      // Exact match gets highest score
      if (searchName.toLowerCase() === playerName.toLowerCase()) {
        confidence = 1.0;
      }
      
      // Active players get bonus
      if (playerData.status === 'Active') {
        confidence += 0.2;
      }
      
      // Players with teams get bonus
      if (playerData.team) {
        confidence += 0.1;
      }
      
      // Fantasy relevant positions get bonus
      const fantasyPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
      if (fantasyPositions.includes(playerData.position)) {
        confidence += 0.15;
      }
      
      return Math.min(confidence, 1.0);
    },

    /**
     * Find best single match with disambiguation logic.
     * Returns single best match or indicates when disambiguation is needed.
     * 
     * @param {string} searchName - Name to search for
     * @param {Object} players - Player database object
     * @param {Object} [options={}] - Search options
     * @returns {Object|null} Best match object or null if no matches found
     */
    findBestMatch: function(searchName, players, options = {}) {
      const matches = this.findPlayerMatches(searchName, players, options);
      
      if (matches.length === 0) {
        return null;
      }
      
      if (matches.length === 1) {
        return matches[0];
      }
      
      // For multiple matches, return highest confidence
      const bestMatch = matches[0];
      
      // If confidence is significantly higher, return it
      if (bestMatch.confidence > matches[1].confidence + 0.1) {
        return bestMatch;
      }
      
      // If tied, prefer active players
      const activeMatches = matches.filter(m => m.status === 'Active');
      if (activeMatches.length === 1) {
        return activeMatches[0];
      }
      
      // If still tied, prefer players with teams
      const teamMatches = activeMatches.filter(m => m.team);
      if (teamMatches.length === 1) {
        return teamMatches[0];
      }
      
      // Return best match with metadata about alternatives
      return {
        ...bestMatch,
        alternatives: matches.slice(1, 3), // Include up to 2 alternatives
        needsDisambiguation: true
      };
    },

    /**
     * Batch process multiple player names for efficient matching.
     * Categorizes results into matched, unmatched, ambiguous, and error groups.
     * 
     * @param {Array} playerNames - Array of player names to process
     * @param {Object} players - Player database object
     * @param {Object} [options={}] - Search options
     * @returns {Object} Results object with categorized matches
     */
    processPlayerList: function(playerNames, players, options = {}) {
      const results = {
        matched: [],
        unmatched: [],
        ambiguous: [],
        errors: []
      };

      playerNames.forEach((name, index) => {
        try {
          const cleanName = name.trim();
          if (!cleanName) return;

          const match = this.findBestMatch(cleanName, players, options);
          
          if (!match) {
            results.unmatched.push({
              index,
              searchName: cleanName
            });
          } else if (match.needsDisambiguation) {
            results.ambiguous.push({
              index,
              searchName: cleanName,
              match,
              alternatives: match.alternatives
            });
          } else {
            results.matched.push({
              index,
              searchName: cleanName,
              match
            });
          }
          
        } catch (error) {
          results.errors.push({
            index,
            searchName: name,
            error: error.message
          });
        }
      });

      return results;
    }
  };
})();

// Export for different environments
if (typeof module !== 'undefined') {
  module.exports = NameMatcher;
}

if (typeof window !== 'undefined') {
  window.NameMatcher = NameMatcher;
}
