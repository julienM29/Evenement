import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';

// import listPlugin from '@fullcalendar/list';

document.addEventListener('DOMContentLoaded', function() {
const userId = document.getElementById('idUser').textContent
  const calendarEl = document.getElementById('calendar');

  const calendar = new Calendar(calendarEl, {
    plugins: [ dayGridPlugin ],  
    // plugins: [ dayGridPlugin, timeGridPlugin, listPlugin ],
    locale: 'fr',
    height: 1100,
    initialView: 'dayGridMonth', // Vue initiale
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth' // Définition des vues disponibles
    },
    dayHeaderFormat: { weekday: 'long' },
    events: async function(fetchInfo, successCallback, failureCallback) {
        try {
            const response = await fetch(`http://localhost:3000/api/events/${userId}`); // Remplacez par l'URL de votre API
            const events = await response.json();
            successCallback(events);
        } catch (error) {
            failureCallback(error);
        }
    }
  });

  calendar.render();
});
