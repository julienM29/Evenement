import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';

// import listPlugin from '@fullcalendar/list';

document.addEventListener('DOMContentLoaded', function() {
const userId = document.getElementById('idUser').textContent // Récupère l'id user actuellement dans une div hidden
  const calendarEl = document.getElementById('calendar'); // Sélectionne la div pour afficher le calendrier

  const calendar = new Calendar(calendarEl, {
    plugins: [ dayGridPlugin ],  
    locale: 'fr', // Langue
    height: 1100, // Hauteur
    initialView: 'dayGridMonth', // Vue initiale
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth' // Définition des vues disponibles
    },
    dayHeaderFormat: { weekday: 'long' }, // Format d'affichage des jours sur le calendrier
    events: async function(fetchInfo, successCallback, failureCallback) { // Données des participations de l'utilisateur
        try {
            const response = await fetch(`http://localhost:3000/api/events/${userId}`); // Appel à une route qui renvoie du JSON
            const events = await response.json();
            successCallback(events);
        } catch (error) {
            failureCallback(error);
        }
    }
  });

  calendar.render(); // Affiche le calendrier
});
