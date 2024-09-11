/***** Selecting DOM elements ********/
const info = document.getElementById('info');
const mapElement = document.getElementById('map');
const closeButton = document.getElementById('close-btn');
const tooltip = document.querySelector('.tooltip');
const activities = document.querySelector('.activities');
const body = document.body;
const form = document.querySelector('.form');
const inputs = document.querySelectorAll('.form__input');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputTime = document.querySelector('.form__input--time');
const inputPace = document.querySelector('.form__input--pace');
const inputElevation = document.querySelector('.form__input--elevation');
const btnDeleteAll = document.querySelector('.info__btn--deleteAll');
const deleteAllIcon = document.querySelector('.info__btn--deleteAll__icon');
const sortControl = document.querySelector('.sort-controls');
const fitBoundsBtn = document.querySelector('.fit-bounds-btn');
const loader = document.querySelector('.loader');
const loaderContainer = document.querySelector('.loader-container');
const searchBox = document.getElementById('search-box');
const searchBtn = document.getElementById('search-btn');
const suggestionsContainer = document.querySelector('.suggestions-box');

const dockDistance = 70;
let isInfoVisible = false;

/***** Classes ********/

/***** Workout class ********/
class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);

    constructor(coords, distance, time, locationDescription) {
        this.coords = coords;
        this.distance = distance;
        this.time = time;
        this.locationDescription = locationDescription;
    }

    _setDescription() {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()} in ${this.locationDescription}`;
    }
}

class Running extends Workout {
    type = 'running';
    constructor(coords, distance, time, pace, locationDescription) {
        super(coords, distance, time);
        this.pace = pace;
        this.locationDescription = locationDescription;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        this.paceRunning = this.time / this.distance;
        return this.paceRunning;
    }
}

class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, time, elevationGain, locationDescription) {
        super(coords, distance, time);
        this.elevationGain = elevationGain;
        this.locationDescription = locationDescription;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        this.speed = this.distance / this.time;
        return this.speed;
    }
}

/***** App class ********/
class App {
    #map;
    #mapEvent;
    #workouts = [];
    #mapZoomLevel = 14;
    #markers = {};

    constructor() {
        this._getPosition().then(pos => this._loadMap(pos)).catch(err => showMessage(err.message, 'error'));
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationInput);
        activities.addEventListener('click', this._moveToMarker.bind(this));
        btnDeleteAll.addEventListener('click', this.deleteAllActivities.bind(this));
        activities.addEventListener('click', this.deleteActivity.bind(this));
        activities.addEventListener('click', this._editActivity.bind(this));
        sortControl.addEventListener('click', this._sortWorkouts.bind(this));
        fitBoundsBtn.addEventListener('click', this._fitMapToWorkouts.bind(this));
        searchBtn.addEventListener('click', this._searchLocation.bind(this));
        searchBox.addEventListener('keydown', this._handleKeyDown.bind(this));

        searchBox.addEventListener('input', async () => {
            const query = searchBox.value.trim();
            if (query) {
                const suggestions = await this._fetchSuggestions(query);
                this._displaySuggestions(suggestions);
            } else {
                document.getElementById('suggestions').innerHTML = '';
            }
        });

        searchBox.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this._searchLocation();
            }
        });

        this._searchInitiatedManually = false;

        this._currentSuggestionIndex = -1;

        this._getLocalStorage();
    }

    _handleKeyDown(event) {
        const suggestions = document.querySelectorAll('.suggestion-item');
        const query = searchBox.value.trim();

        if (suggestions.length === 0) return;

        switch (event.key) {
            case 'ArrowDown':
                this._currentSuggestionIndex++;
                if (this._currentSuggestionIndex >= suggestions.length) {
                    this._currentSuggestionIndex = 0;
                }
                this._highlightSuggestion(suggestions);
                break;
            case 'ArrowUp':
                this._currentSuggestionIndex--;
                if (this._currentSuggestionIndex < 0) {
                    this._currentSuggestionIndex = suggestions.length - 1;
                }
                this._highlightSuggestion(suggestions);
                break;
            case 'Enter':
                // Check if query length is less than 2 characters
                if (query.length < 2) {
                    showMessage('At least 2 characters required', 'error');
                    return;
                }

                if (this._currentSuggestionIndex > -1) {
                    const selectedSuggestion = suggestions[this._currentSuggestionIndex];
                    const lat = selectedSuggestion.getAttribute('data-lat');
                    const lon = selectedSuggestion.getAttribute('data-lon');

                    this._searchInitiatedManually = false;
                    this._flyToLocation(lat, lon);

                    suggestionsContainer.innerHTML = '';
                    suggestionsContainer.style.display = 'none';

                    // Show success message if input length is sufficient
                    showMessage('Location found', 'success');
                }
                break;
            case 'Escape':
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';
                break;
        }
    }



    _highlightSuggestion(suggestions) {
        suggestions.forEach(item => item.classList.remove('highlight'));

        if (this._currentSuggestionIndex > -1) {
            suggestions[this._currentSuggestionIndex].classList.add('highlight');
        }
    }

    _flyToLocation(lat, lon) {
        this.#map.flyTo([lat, lon], this.#mapZoomLevel, {
            animate: true,
            duration: 4,
            easeLinearity: 0.2
        });
    }

    async _fetchSuggestions(query) {
        if (!query) {
            suggestionsContainer.style.display = 'none';
            return [];
        }

        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`;

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);

            const data = await res.json();
            return data.map(suggestion => ({
                displayName: suggestion.display_name,
                lat: suggestion.lat,
                lon: suggestion.lon
            }));
        } catch (err) {
            showLoader('Suggestion failed', 'error');
            return [];
        }
    }

    async _searchLocation() {
        const query = searchBox.value.trim();
        if (!query) {
            showMessage('Please enter a location to search', 'error');
            return;
        }

        // Add a check for the minimum number of characters
        if (query.length < 2) {
            showMessage('At least 2 characters required', 'error');
            return;
        }

        showLoader();

        try {
            const apiKey = 'e361d327553c4955bab6f9ba66aec393';
            const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${apiKey}`;
            const res = await fetch(url);

            if (!res.ok) {
                throw new Error(`Something went wrong`);
            }

            const data = await res.json();

            if (!data.results || data.results.length === 0) {
                throw new Error('Location not found');
            }

            const { lat, lng } = data.results[0].geometry;

            if (!lat || !lng) {
                throw new Error('Location not found');
            }

            this._flyToLocation(lat, lng);

            searchBox.value = '';

            if (this._searchInitiatedManually) {
                showMessage('Location found', 'success');
            } else {
                showMessage(`Location found: ${query}`, 'success');
            }
        } catch (err) {
            showMessage(err.message, 'error');
        } finally {
            hideLoader();
            setTimeout(() => {
                suggestionsContainer.style.display = 'none';
            }, 4000);
        }
    }


    _displaySuggestions(suggestions) {
        suggestionsContainer.innerHTML = '';
        this._currentSuggestionIndex = -1;

        if (suggestions.length === 0) {
            suggestionsContainer.innerHTML = '<p>No suggestions found</p>';
            return;
        }

        suggestionsContainer.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item" data-lat="${suggestion.lat}" data-lon="${suggestion.lon}">
                ${suggestion.displayName}
            </div>
        `).join('');

        suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', function () {
                const lat = item.getAttribute('data-lat');
                const lon = item.getAttribute('data-lon');

                this._searchInitiatedManually = false;

                this._flyToLocation(lat, lon);

                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';

                showMessage('Location found', 'success');
            }.bind(this));
        });

        suggestionsContainer.style.display = 'block';
    }


    async _getLocationDescription(lat, lng) {
        const apiKey = 'bdc_39ee8452eede407482ab31b369ac8ebc';
        const url = `https://api-bdc.net/data/reverse-geocode?latitude=${lat}&longitude=${lng}&localityLanguage=en&key=${apiKey}`;

        try {
            const resGeo = await fetch(url);

            if (!resGeo.ok) {
                throw new Error(`HTTP error! Status: ${resGeo.status}`);
            }

            const dataGeo = await resGeo.json();

            if (!dataGeo || !dataGeo.city || !dataGeo.countryName) {
                throw new Error('No results found');
            }

            const city = dataGeo.city || 'Unknown city';
            const country = dataGeo.countryCode || 'Unknown country';

            if (city === 'Unknown city' && country === 'Unknown country') {
                throw new Error('Invalid location for workout');
            }

            return `${city} [${country}]`;
        } catch (err) {
            showMessage(err.message, 'error');
            return 'Unknown location';
        }
    }

    _fitMapToWorkouts() {
        if (this.#workouts.length === 0) {
            showMessage('No workouts to display.', 'error');
            return;
        }

        const bounds = L.latLngBounds(
            this.#workouts.map(workout => workout.coords)
        );

        this.#map.fitBounds(bounds, {
            padding: [20, 20],
        });
    }

    _sortWorkouts(e) {
        const sortBy = e.target.dataset.sort;
        if (!sortBy) return;

        this.#workouts.sort((a, b) => {
            if (sortBy === 'distance') return a.distance - b.distance;
            if (sortBy === 'time') return a.time - b.time;
            if (sortBy === 'pace') {
                const paceA = a.type === 'running' ? a.pace || a.calcPace() : Infinity;
                const paceB = b.type === 'running' ? b.pace || b.calcPace() : Infinity;
                return paceA - paceB;
            }
            if (sortBy === 'type') return a.type.localeCompare(b.type);
            if (sortBy === 'elevationGain') {
                const elevationA = a.type === 'cycling' ? a.elevationGain : -Infinity;
                const elevationB = b.type === 'cycling' ? b.elevationGain : -Infinity;
                return elevationA - elevationB;
            }
        });

        this._clearWorkouts();
        this.#workouts.forEach(workout => this._renderWorkout(workout));
    }

    _clearWorkouts() {
        const workoutElements = document.querySelectorAll('.activity');
        workoutElements.forEach(workoutEl => workoutEl.remove());
    }

    _infoAutoClose() {
        setTimeout(() => {
            info.classList.remove('show');
        }, 300);
    }

    /***** Edit Activity ********/
    _editActivity(e) {
        const editButton = e.target.closest('.edit-activity');
        if (!editButton) return;

        const workoutElement = editButton.closest('.activity');
        if (!workoutElement) return;

        const workoutId = workoutElement.dataset.id;
        const workout = this.#workouts.find(work => work.id === workoutId);
        this._showForm(null, workout);
    }

    _toggleDeletionBtn() {
        if (this.#workouts.length > 0) {
            btnDeleteAll.style.display = 'block';
        } else {
            btnDeleteAll.style.display = 'none';
        }
    }

    _getPosition() {
        if (navigator.geolocation) {
            return new Promise(function (resolve, reject) {
                navigator.geolocation.getCurrentPosition(
                    position => {
                        const { latitude, longitude } = position.coords;
                        resolve(position);
                    },
                    () => reject(new Error('Could not get your current position'))
                );
            });
        }
    }


    _loadMap(position) {
        const { latitude, longitude } = position.coords;
        const coords = [latitude, longitude];

        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

        L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
            maxZoom: 20,
            attribution: 'Powered by'
        }).addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        });
    }

    _showForm(mapE, workout = null) {
        this.#mapEvent = mapE;

        form.classList.remove('hidden');
        form.style.display = 'grid';

        if (workout) {
            inputType.value = workout.type;
            inputDistance.value = workout.distance;
            inputTime.value = workout.time;
            if (workout.type === 'running') {
                inputPace.value = workout.pace;
                inputElevation.value = '';
                inputElevation.closest('.form__row').classList.add('form__row--hidden');
                inputPace.closest('.form__row').classList.remove('form__row--hidden');
            } else if (workout.type === 'cycling') {
                inputElevation.value = workout.elevationGain;
                inputPace.value = '';
                inputPace.closest('.form__row').classList.add('form__row--hidden');
                inputElevation.closest('.form__row').classList.remove('form__row--hidden');
            }
            form.dataset.editId = workout.id;
        } else {
            inputDistance.value = inputTime.value = inputPace.value = inputElevation.value = '';
            form.dataset.editId = '';
        }

        setTimeout(() => {
            inputDistance.focus();
        }, 100);
    }

    _hideForm() {
        inputDistance.value = inputTime.value = inputPace.value = inputElevation.value = '';
        form.dataset.editId = '';
        form.style.display = 'none';
        form.classList.add('hidden');
    }

    _toggleElevationInput() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputPace.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _editExistingWorkout(workout, distance, time, pace, elevation) {
        this._removeLayer(workout.id);
        document.querySelector(`.activity[data-id="${workout.id}"]`).remove();

        workout.distance = distance;
        workout.time = time;
        if (workout instanceof Running) {
            workout.pace = pace;
            workout.calcPace();
        } else if (workout instanceof Cycling) {
            workout.elevationGain = elevation;
            workout.calcSpeed();
        }

        this._renderWorkout(workout);
        this._renderWorkoutMarker(workout);
    }

    async _newWorkout(e) {
        e.preventDefault();
        showLoader();

        const isEditing = form.dataset.editId;
        const type = inputType.value;
        const distance = +inputDistance.value;
        const time = +inputTime.value;
        let workout;

        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const positiveInputs = (...inputs) => inputs.every(inp => inp > 0);

        try {
            if (isEditing) {
                let oldWorkout = this.#workouts.find(work => work.id === isEditing);

                if (!oldWorkout) return;

                const { id, coords, locationDescription } = oldWorkout;

                if (type === 'running') {
                    const pace = +inputPace.value;

                    if (!validInputs(distance, time, pace) || !positiveInputs(distance, time, pace)) {
                        return showMessage('Valid and positive numbers are allowed', 'error');
                    }

                    workout = new Running(coords, distance, time, pace, locationDescription);
                    showMessage('Successfully updated', 'success');
                } else if (type === 'cycling') {
                    const elevation = +inputElevation.value;

                    if (!validInputs(distance, time, elevation) || !positiveInputs(distance, time)) {
                        return showMessage('Valid and positive numbers are allowed', 'error');
                    }

                    workout = new Cycling(coords, distance, time, elevation, locationDescription);
                    showMessage('Successfully updated', 'success');
                }

                workout.id = id;

                const index = this.#workouts.findIndex(work => work.id === isEditing);
                this.#workouts[index] = workout;

                this._removeLayer(workout.id);
                this._renderWorkoutMarker(workout);

                document.querySelector(`[data-id="${workout.id}"]`).remove();
                this._renderWorkout(workout);

            } else {
                const { lat, lng } = this.#mapEvent.latlng;

                const locationDescription = await this._getLocationDescription(lat, lng);

                if (locationDescription === 'Unknown location') {
                    showMessage('Invalid location for workout', 'error');
                    return;
                }

                if (type === 'running') {
                    const pace = +inputPace.value;

                    if (!validInputs(distance, time, pace) || !positiveInputs(distance, time, pace)) {
                        return showMessage('Valid and positive numbers are allowed', 'error');
                    }

                    workout = new Running([lat, lng], distance, time, pace, locationDescription);
                    showMessage('Running activity added', 'success');
                } else if (type === 'cycling') {
                    const elevation = +inputElevation.value;

                    if (!validInputs(distance, time, elevation) || !positiveInputs(distance, time)) {
                        return showMessage('Valid and positive numbers are allowed', 'error');
                    }

                    workout = new Cycling([lat, lng], distance, time, elevation, locationDescription);
                    showMessage('Cycling activity added', 'success');
                }

                this.#workouts.push(workout);
                this._renderWorkout(workout);
                this._renderWorkoutMarker(workout);
            }

            this._hideForm();
            this._setLocalStorage();
            this._toggleDeletionBtn();
        } catch (err) {
            showMessage(err.message, 'error');
        }
        finally {
            hideLoader();
        }
    }

    _renderWorkoutMarker(workout) {
        const marker = L.marker(workout.coords, { riseOnHover: true }).addTo(this.#map)
            .bindPopup(L.popup({
                maxWidth: 300,
                minWidth: 160,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`
            }))
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'} ${workout.description}`)
            .openPopup();

        this.#markers[workout.id] = marker;
    }

    _renderWorkout(workout) {
        let html = `
            <li class="activity activity--${workout.type}" data-id="${workout.id}">
                <div class="activity__actions">
                    <button class="delete-activity actions">
                        <i class="fa fa-trash delete-activity__icon icons"></i>
                        <div class="tooltip--actions tooltip__delete">Delete</div>
                    </button>
                    <button class="edit-activity actions">
                        <i class="fa-solid fa-pen edit-activity__icon icons"></i>
                        <div class="tooltip--actions tooltip__edit">Edit</div>
                    </button>
                </div>
                <h2 class="activity__title">${workout.description}</h2>
                
                <div class="activity__details-wrapper">
                    <div class="activity__details">
                        <span class="activity__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
                        <span class="activity__value">${workout.distance}</span>
                        <span class="activity__unit">km</span>
                    </div>
                    <div class="activity__details">
                        <span class="activity__icon">⏳</span>
                        <span class="activity__value">${workout.time}</span>
                        <span class="activity__unit">min</span>
                    </div>
        `;

        if (workout.type === 'running') {
            html += `
                    <div class="activity__details">
                        <span class="activity__icon">🚀</span>
                        <span class="activity__value">${workout.paceRunning.toFixed(1)}</span>
                        <span class="activity__unit">min/km</span>
                    </div>
                    <div class="activity__details">
                        <span class="activity__icon">👣</span>
                        <span class="activity__value">${workout.pace}</span>
                        <span class="activity__unit">spm</span>
                    </div>
                `;
        }

        if (workout.type === 'cycling') {
            html += `
                    <div class="activity__details">
                        <span class="activity__icon">🚀</span>
                        <span class="activity__value">${workout.speed.toFixed(1)}</span>
                        <span class="activity__unit">km/h</span>
                    </div>
                    <div class="activity__details">
                        <span class="activity__icon">⛰</span>
                        <span class="activity__value">${workout.elevationGain}</span>
                        <span class="activity__unit">m</span>
                    </div>
                `;
        }

        html += `
            </div> <!-- Close the details wrapper -->
            </li>`;

        form.insertAdjacentHTML('afterend', html);
    }

    _moveToMarker(e) {
        const workoutElement = e.target.closest('.activity');

        if (!workoutElement) return;

        const workout = this.#workouts.find(work => work.id === workoutElement.dataset.id);
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animation: true,
            pan: {
                duration: 1,
                easeLinearity: 0.4
            }
        });
    }

    _setLocalStorage() {
        localStorage.setItem('activities', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('activities'));

        if (!data) return;

        this.#workouts = data;
        this.#workouts.forEach(work => {
            this._renderWorkout(work);
        });

        this._toggleDeletionBtn();
    }

    _removeLayer(workoutId = null) {
        if (workoutId) {
            const marker = this.#markers[workoutId];
            if (marker) {
                this.#map.removeLayer(marker);
                delete this.#markers[workoutId];
            }
        } else {
            if (this.#map) {
                this.#map.eachLayer(layer => {
                    if (layer instanceof L.Marker) {
                        this.#map.removeLayer(layer);
                    }
                });
            }
        }
    }

    /***** Delete All Activities ********/
    deleteAllActivities() {
        this.reset();
        this._toggleDeletionBtn();
        this._infoAutoClose();
        showMessage('Deleted all activities', 'success');
    }

    deleteActivity(e) {
        const deleteButton = e.target.closest('.delete-activity');
        if (!deleteButton) return;

        const workoutElement = deleteButton.closest('.activity');
        if (!workoutElement) return;

        const workoutId = workoutElement.dataset.id;
        this.#workouts = this.#workouts.filter(work => work.id !== workoutId);
        this._setLocalStorage();
        workoutElement.remove();
        this._removeLayer(workoutId);
        this._infoAutoClose();
        showMessage('Deleted activity', 'success');
    }

    reset() {
        localStorage.removeItem('activities');
        this.#workouts = [];
        document.querySelectorAll('.activity').forEach(activity => activity.remove());
        this._removeLayer();
    }
}

const app = new App();

/***** Show and close info ********/

window.showInfo = () => {
    info.classList.add('show');
    tooltip.style.display = 'none';
    body.classList.add('no-animations');
    isInfoVisible = true;
};

const hideInfo = () => {
    info.classList.remove('show');
    tooltip.style.display = 'block';
    body.classList.remove('no-animations');
    isInfoVisible = false;
};

let isDragging = false;
let startX, startY, initialX, initialY;

const checkIfInsideSearchBox = (x, y) => {
    const searchBoxRect = searchBox.getBoundingClientRect();
    return x >= searchBoxRect.left &&
        x <= searchBoxRect.right &&
        y >= searchBoxRect.top &&
        y <= searchBoxRect.bottom;
};

const handleDragStart = (e) => {
    if (checkIfInsideSearchBox(e.clientX, e.clientY)) {
        isDragging = false;
        return;
    }

    isDragging = true;
    startX = (e.clientX !== undefined ? e.clientX : e.touches[0].clientX);
    startY = (e.clientY !== undefined ? e.clientY : e.touches[0].clientY);
    initialX = info.offsetLeft;
    initialY = info.offsetTop;
    info.style.cursor = 'grabbing';
};

const handleDragMove = (e) => {
    if (!isDragging) return;

    const clientX = (e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0].clientX));
    const clientY = (e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0].clientY));

    if (clientX === undefined || clientY === undefined) return;

    if (checkIfInsideSearchBox(clientX, clientY)) {
        isDragging = false;
        return;
    }

    const dx = clientX - startX;
    const dy = clientY - startY;
    const newLeft = initialX + dx;
    const newTop = initialY + dy;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const infoRect = info.getBoundingClientRect();
    const newRight = newLeft + infoRect.width;
    const newBottom = newTop + infoRect.height;

    info.style.left = Math.max(0, Math.min(newLeft, viewportWidth - infoRect.width)) + 'px';
    info.style.top = Math.max(0, Math.min(newTop, viewportHeight - infoRect.height)) + 'px';
};

const handleDragEnd = () => {
    if (isDragging) {
        const infoRect = info.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (infoRect.left < dockDistance) {
            info.style.left = '0px';
        } else if (viewportWidth - infoRect.right < dockDistance) {
            info.style.left = `${viewportWidth - infoRect.width}px`;
        }

        if (infoRect.top < dockDistance) {
            info.style.top = '0px';
        } else if (viewportHeight - infoRect.bottom < dockDistance) {
            info.style.top = `${viewportHeight - infoRect.height}px`;
        }

        isDragging = false;
        info.style.cursor = 'move';
    }
};

info.addEventListener('mousedown', handleDragStart);
info.addEventListener('touchstart', handleDragStart);

document.addEventListener('mousemove', handleDragMove);
document.addEventListener('touchmove', handleDragMove);

document.addEventListener('mouseup', handleDragEnd);
document.addEventListener('touchend', handleDragEnd);

searchBox.addEventListener('mousedown', () => {
    isDragging = false;
});

searchBox.addEventListener('mouseup', () => {
    isDragging = false;
});

searchBox.addEventListener('mousemove', () => {
    isDragging = false;
});

closeButton.addEventListener('click', hideInfo);

mapElement.addEventListener('click', () => {
    if (!isInfoVisible) {
        window.showInfo();
    }
});

/***** Form ********/

inputs.forEach(input => {
    input.addEventListener('focus', (e) => {
        e.target.closest('.form__row').querySelector('.form__label').classList.add('focused');
    });

    input.addEventListener('blur', (e) => {
        e.target.closest('.form__row').querySelector('.form__label').classList.remove('focused');
    });
});

/***** Message function ********/

function showMessage(message, type) {
    const errorContainer = document.querySelector('.message-container-error');
    const successContainer = document.querySelector('.message-container-success');

    errorContainer.innerHTML = '';
    successContainer.innerHTML = '';

    if (type === 'error') {
        errorContainer.innerHTML = message;
        errorContainer.classList.remove('hide');
        errorContainer.classList.add('show');
        successContainer.classList.remove('show');
        successContainer.classList.add('hide');
    } else if (type === 'success') {
        successContainer.innerHTML = message;
        successContainer.classList.remove('hide');
        successContainer.classList.add('show');
        errorContainer.classList.remove('show');
        errorContainer.classList.add('hide');
    }

    setTimeout(() => {
        if (type === 'error') {
            errorContainer.classList.remove('show');
            errorContainer.classList.add('hide');
        } else if (type === 'success') {
            successContainer.classList.remove('show');
            successContainer.classList.add('hide');
        }
    }, 3500);
}

/***** changing font awesome icons when hovering ********/

// btnDeleteAll
btnDeleteAll.addEventListener('mouseover', () => {
    deleteAllIcon.classList.remove('fa-trash-alt');
    deleteAllIcon.classList.add('fa-trash');
});

btnDeleteAll.addEventListener('mouseout', () => {
    deleteAllIcon.classList.add('fa-trash-alt');
    deleteAllIcon.classList.remove('fa-trash');
});

document.addEventListener('DOMContentLoaded', () => {
    const deleteActivityBtns = document.querySelectorAll('.delete-activity');
    const deleteActivityIcons = document.querySelectorAll('.delete-activity__icon');
    const editActivityBtns = document.querySelectorAll('.edit-activity');
    const editActivityIcons = document.querySelectorAll('.edit-activity__icon');

    // Loader
    showLoader();

    // deleteActivityBtns
    deleteActivityBtns.forEach((btn, index) => {
        const iconDelete = deleteActivityIcons[index];

        btn.addEventListener('mouseover', () => {
            iconDelete.classList.remove('fa-trash');
            iconDelete.classList.add('fa-trash-alt');
        });

        btn.addEventListener('mouseout', () => {
            iconDelete.classList.add('fa-trash');
            iconDelete.classList.remove('fa-trash-alt');
        });
    });

    // editActivityBtns
    editActivityBtns.forEach((btn, index) => {
        const iconEdit = editActivityIcons[index];

        btn.addEventListener('mouseover', () => {
            iconEdit.classList.remove('fa-solid', 'fa-pen');
            iconEdit.classList.add('fa-solid', 'fa-pen-to-square');
        });

        btn.addEventListener('mouseout', () => {
            iconEdit.classList.remove('fa-solid', 'fa-pen-to-square');
            iconEdit.classList.add('fa-solid', 'fa-pen');
        });
    });
});

/***** Loader ********/

function showLoader() {
    loaderContainer.style.display = 'flex';
}

function hideLoader() {
    loaderContainer.style.display = 'none';
}

window.addEventListener('load', function () {
    hideLoader();
})