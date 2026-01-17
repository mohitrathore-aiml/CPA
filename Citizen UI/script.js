const API_BASE = 'http://localhost:3000/api';

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}


let recognition = null;
let isListening = false;

function initSpeechRecognition() {

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.warn('Speech Recognition not supported in this browser');
    const micBtn = document.getElementById('mic-btn');
    if (micBtn) {
      micBtn.disabled = true;
      micBtn.title = 'Speech recognition not supported in your browser';
    }
    return false;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-IN';

  recognition.onstart = function() {
    console.log('🎤 Speech recognition started');
    isListening = true;
    updateMicButton(true);
    showSpeechStatus('listening', '🎤 Listening... Speak now!');
  };

  recognition.onresult = function(event) {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }

    const textarea = document.getElementById('complaint-textarea');
    if (textarea) {
  
      if (finalTranscript) {
        const currentText = textarea.value;
        textarea.value = currentText + finalTranscript;
      }

      if (interimTranscript) {
        showSpeechStatus('listening', `🎤 Hearing: "${interimTranscript}"`);
      }
    }

    console.log('Interim:', interimTranscript);
    console.log('Final:', finalTranscript);
  };

  recognition.onerror = function(event) {
    console.error('Speech recognition error:', event.error);
    let errorMessage = '❌ ';
    
    switch(event.error) {
      case 'no-speech':
        errorMessage += 'No speech detected. Please try again.';
        break;
      case 'audio-capture':
        errorMessage += 'Microphone not found or not working.';
        break;
      case 'not-allowed':
        errorMessage += 'Microphone permission denied. Please allow microphone access.';
        break;
      case 'network':
        errorMessage += 'Network error. Check your connection.';
        break;
      default:
        errorMessage += `Error: ${event.error}`;
    }
    
    showSpeechStatus('error', errorMessage);
    stopSpeechRecognition();
  };

  recognition.onend = function() {
    console.log('🎤 Speech recognition ended');
    if (isListening) {
      console.log('Restarting recognition...');
      try {
        recognition.start();
      } catch (e) {
        console.log('Could not restart:', e);
        stopSpeechRecognition();
      }
    }
  };

  console.log('✅ Speech recognition initialized');
  return true;
}

function toggleSpeechRecognition() {
  if (!recognition) {
    const initialized = initSpeechRecognition();
    if (!initialized) {
      alert('❌ Speech recognition is not supported in your browser.\n\nPlease use:\n• Chrome\n• Edge\n• Safari (iOS 14.5+)');
      return;
    }
  }

  if (isListening) {
    stopSpeechRecognition();
  } else {
    startSpeechRecognition();
  }
}

function startSpeechRecognition() {
  try {
    recognition.start();
    console.log('Starting speech recognition...');
  } catch (e) {
    console.error('Could not start recognition:', e);
    if (e.message.includes('already started')) {
      isListening = true;
      updateMicButton(true);
    }
  }
}

function stopSpeechRecognition() {
  if (recognition) {
    isListening = false;
    recognition.stop();
    updateMicButton(false);
    showSpeechStatus('success', '✅ Recording stopped');
    setTimeout(() => {
      hideSpeechStatus();
    }, 2000);
  }
}

function updateMicButton(listening) {
  const micBtn = document.getElementById('mic-btn');
  if (micBtn) {
    if (listening) {
      micBtn.classList.add('listening');
      micBtn.title = 'Click to stop recording';
    } else {
      micBtn.classList.remove('listening');
      micBtn.title = 'Click to speak';
    }
  }
}

function showSpeechStatus(type, message) {
  const statusDiv = document.getElementById('speech-status');
  if (statusDiv) {
    statusDiv.className = `speech-status active ${type}`;
    statusDiv.textContent = message;
  }
}

function hideSpeechStatus() {
  const statusDiv = document.getElementById('speech-status');
  if (statusDiv) {
    statusDiv.className = 'speech-status';
  }
}

function getCurrentLocation() {
  const btn = document.getElementById('get-location-btn');
  const statusDiv = document.getElementById('location-status');
  const stateField = document.getElementById('state-field');
  const districtField = document.getElementById('district-field');
  const areaField = document.getElementById('area-field');

  console.log('🔍 getCurrentLocation() called');

  if (!navigator.geolocation) {
    showStatus('error', '❌ Geolocation is not supported by your browser');
    console.error('Geolocation not supported');
    return;
  }

  console.log('✅ Geolocation available');

  btn.disabled = true;
  btn.innerHTML = '<span>⏳</span><span>Getting location...</span>';
  showStatus('', '🔄 Fetching your location... (This may take 10-30 seconds)');

  console.log('📍 Requesting geolocation...');

  const timeoutId = setTimeout(() => {
    console.error('⏱️ Custom timeout reached (30s)');
    btn.disabled = false;
    btn.innerHTML = '<span>📍</span><span>Use My Current Location</span>';
    showStatus('error', '❌ Location request took too long. Please try again or enter manually.');
  }, 30000);

  navigator.geolocation.getCurrentPosition(

    async (position) => {
      clearTimeout(timeoutId);
      
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      console.log('📍 Location obtained successfully!');
      console.log('  Latitude:', lat);
      console.log('  Longitude:', lng);
      console.log('  Accuracy:', accuracy, 'meters');

      showStatus('', '🔄 Converting coordinates to address...');

      try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
        
        console.log('🗺️ Calling OpenStreetMap Nominatim API...');
        console.log('URL:', url);

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'CPA-Complaint-Portal/1.0'
          }
        });

        if (!response.ok) {
          throw new Error(`Geocoding failed: ${response.status}`);
        }

        const data = await response.json();
        
        console.log('✅ Geocoding successful!');
        console.log('Full response:', data);
        console.log('Address:', data.display_name);
        console.log('Address details:', data.address);

        btn.disabled = false;
        btn.innerHTML = '<span>📍</span><span>Use My Current Location</span>';

        if (data && data.address) {
          const addr = data.address;
          
          console.log('Raw address object:', addr);
          
          let state = addr.state || 
                      addr['ISO3166-2-lvl4'] || 
                      addr.region || 
                      '';
          
          const district = addr.county || 
                          addr.state_district || 
                          addr.city_district ||
                          addr.city || 
                          addr.town || 
                          addr.municipality ||
                          '';
          
          const area = addr.neighbourhood || 
                      addr.suburb || 
                      addr.quarter ||
                      addr.village || 
                      addr.hamlet || 
                      addr.residential ||
                      addr.city || 
                      addr.town ||
                      addr.locality ||
                      '';

          if (!state && data.display_name) {
            const parts = data.display_name.split(',').map(p => p.trim());
            if (parts.length >= 3) {
              const possibleState = parts[parts.length - 2];
              const indianStates = ['Delhi', 'Haryana', 'Uttar Pradesh', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'West Bengal', 'Gujarat', 'Rajasthan', 'Punjab', 'Madhya Pradesh', 'Andhra Pradesh', 'Telangana', 'Bihar', 'Odisha', 'Kerala', 'Assam', 'Jharkhand', 'Chhattisgarh', 'Uttarakhand', 'Goa', 'Himachal Pradesh', 'Tripura', 'Manipur', 'Meghalaya', 'Nagaland', 'Mizoram', 'Arunachal Pradesh', 'Sikkim'];
              if (indianStates.some(s => possibleState.includes(s))) {
                state = possibleState;
              }
            }
          }

          console.log('Parsed address:', { state, district, area });

          stateField.value = state;
          districtField.value = district;
          areaField.value = area;

          if (!state) {
            showStatus('success', `✅ Location detected: ${data.display_name}<br><em style="color: #d97706;">⚠️ Please manually enter the State field</em>`);
          } else {
            showStatus('success', `✅ Location detected: ${data.display_name}`);
          }

          [stateField, districtField, areaField].forEach(field => {
            if (field.value) {
              field.style.backgroundColor = '#e8f5e9';
              field.style.transition = 'background-color 0.3s';
              setTimeout(() => {
                field.style.backgroundColor = '';
              }, 1500);
            } else {
              field.style.backgroundColor = '#fff3cd';
              field.style.transition = 'background-color 0.3s';
              setTimeout(() => {
                field.style.backgroundColor = '';
              }, 1500);
            }
          });

          console.log('✅ Fields auto-filled:', {
            state: stateField.value,
            district: districtField.value,
            area: areaField.value
          });
        } else {
          throw new Error('No address data in response');
        }

      } catch (error) {
        console.error('❌ Geocoding error:', error);
        btn.disabled = false;
        btn.innerHTML = '<span>📍</span><span>Use My Current Location</span>';
        showStatus('error', `❌ Could not determine address: ${error.message}`);
      }
    },
    (error) => {
      clearTimeout(timeoutId);
      
      btn.disabled = false;
      btn.innerHTML = '<span>📍</span><span>Use My Current Location</span>';

      console.error('❌ Geolocation error occurred');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);

      let errorMessage = '';
      let helpText = '';
      
      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = '❌ Location permission denied.';
          helpText = 'Please enable location access in your browser settings and try again.';
          console.error('PERMISSION_DENIED: User denied location access');
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = '❌ Location information unavailable.';
          helpText = 'Your device cannot determine your location. Please enter address manually.';
          console.error('POSITION_UNAVAILABLE: Location data not available');
          break;
        case error.TIMEOUT:
          errorMessage = '❌ Location request timed out.';
          helpText = 'The request took too long. Please try again or enter manually.';
          console.error('TIMEOUT: Location request exceeded timeout');
          break;
        default:
          errorMessage = '❌ An unknown error occurred.';
          helpText = 'Please try again or enter your address manually.';
          console.error('UNKNOWN ERROR:', error);
      }
      
      showStatus('error', `${errorMessage} ${helpText}`);
    },

    {
      enableHighAccuracy: false,
      timeout: 25000,
      maximumAge: 60000
    }
  );
}

function parseAddressComponents(components) {
  return {};
}

function showStatus(type, message) {
  const statusDiv = document.getElementById('location-status');
  statusDiv.style.display = 'block';
  statusDiv.className = `location-status ${type}`;
  statusDiv.innerHTML = message; 
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 8000);
  }
}


const form = document.getElementById('complaint-form');

if (form) {
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (isListening) {
      stopSpeechRecognition();
    }

    const citizenText = document.getElementById('complaint-textarea').value;
    const department = form.querySelector('select').value;
    
    const stateField = document.getElementById('state-field');
    const districtField = document.getElementById('district-field');
    const areaField = document.getElementById('area-field');

    const locationString = `${areaField.value}, ${districtField.value}, ${stateField.value}`;

    console.log('Submitting complaint:', {
      citizenText,
      department,
      location: locationString
    });

    try {

      const res = await fetch(`${API_BASE}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          citizenText, 
          department, 
          location: locationString 
        })
      });

      if (!res.ok) throw new Error('Server error');

      const data = await res.json();
      
      console.log('✅ Complaint registered:', data);
      

      document.getElementById('complaint-id').innerText = data.complaintId;
      showScreen('ack-screen');
      
      form.reset();
      document.getElementById('location-status').style.display = 'none';
      hideSpeechStatus();
      
    } catch (err) {
      alert("❌ Submission failed. Is the Flask server running on port 3000?");
      console.error('Submission error:', err);
    }
  });
}


async function trackComplaint() {
  const id = document.getElementById('track-id').value.trim();
  const result = document.getElementById('track-result');

  if (!id) {
    result.innerHTML = '⚠️ Please enter a Complaint ID';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/complaints/${id}`);
    if (!res.ok) throw new Error('Not found');

    const data = await res.json();
    
    result.innerHTML = `
      <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin-top: 15px;">
        <strong>Status:</strong> <span style="color: #0066cc;">${data.status}</span><br>
        <strong>Priority:</strong> <span style="color: ${getPriorityColor(data.priority)};">${data.priority}</span><br>
        <strong>Department:</strong> ${data.department}<br>
        <strong>Location:</strong> ${data.location}<br>
        <strong>Summary:</strong> ${data.aiSummary || data.citizenText}<br>
        <em style="color: #666;">Reason: ${data.aiPriorityReason || 'Standard processing'}</em>
      </div>
    `;

    renderTrackingTimeline(data.progressTimeline);
    showScreen('tracking-timeline-section');

  } catch (err) {
    result.innerHTML = '❌ Complaint not found. Please check the ID.';
    console.error('Tracking error:', err);
  }
}

function getPriorityColor(priority) {
  const colors = {
    'Critical': '#dc2626',
    'High': '#ea580c',
    'Medium': '#d97706',
    'Low': '#16a34a'
  };
  return colors[priority] || '#666';
}

function copyToClipboard(text) {
  if (!text) return;
  
  navigator.clipboard.writeText(text).then(() => {
    alert('✅ Complaint ID copied to clipboard!');
  }).catch(err => {
    console.error('Copy failed:', err);
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    alert('✅ Complaint ID copied!');
  });
}

function renderTrackingTimeline(timeline = []) {
  const container = document.getElementById('tracking-timeline');
  if (!container) return;
  
  if (!timeline || timeline.length === 0) {
    container.innerHTML = '<p style="color: #666;">No progress updates available yet.</p>';
    return;
  }

  container.innerHTML = timeline
    .map((step, index) => {
      const date = new Date(step.timestamp).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      const isActive = index === timeline.length - 1;
      
      return `
        <div class="timeline-step ${isActive ? 'active' : ''}">
          <div class="timeline-marker"></div>
          <div class="timeline-content">
            <strong>${step.stage}</strong>
            <p>${step.message}</p>
            <small>Updated by: ${step.updatedBy} • ${date}</small>
          </div>
        </div>
      `;
    })
    .join('');
}

showScreen('home-screen');

console.log('✅ Citizen Portal script loaded');
console.log('📍 Geolocation feature available');
console.log('🎤 Speech-to-text feature available');
