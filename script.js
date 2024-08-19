/***** Selecting DOM elements ********/
const info = document.getElementById('info');
const mapElement = document.getElementById('map');
const closeButton = document.getElementById('close-btn');
const tooltip = document.querySelector('.tooltip');
const activities = document.querySelector('.activities');
const body = document.body;
const dockDistance = 70;
const form = document.querySelector('.form');
const inputs = document.querySelectorAll('.form__input');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputTime = document.querySelector('.form__input--time');
const inputPace = document.querySelector('.form__input--pace');
const inputElevation = document.querySelector('.form__input--elevation');

let isInfoVisible = false;

/***** Error message function ********/
function showError(message) {
    const errorContainer = document.querySelector('.error-container');
    errorContainer.innerText = message;
    errorContainer.classList.remove('hide');
    errorContainer.classList.add('show');

    setTimeout(() => {
        errorContainer.classList.remove('show');
        errorContainer.classList.add('hide');
    }, 3000);
}

/***** Classes ********/

/***** Workout class ********/
class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);

    constructor(coords, distance, time) {
        this.coords = coords;
        this.distance = distance;
        this.time = time;
    }

    _setDescription() {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
}

class Running extends Workout {
    type = 'running';
    constructor(coords, distance, time, pace) {
        super(coords, distance, time);
        this.pace = pace;
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
    constructor(coords, distance, time, elevationGain) {
        super(coords, distance, time);
        this.elevationGain = elevationGain;
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

    constructor() {
        this._getPosition();
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationInput);
        activities.addEventListener('click', this._moveToMarker.bind(this));
        this._getLocalStorage();
    }

    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
                return showError('Could not get your current position');
            });
        }
    }

    _loadMap(position) {
        const { latitude } = position.coords;
        const { longitude } = position.coords;

        const coords = [latitude, longitude];

        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

        L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
            maxZoom: 20,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://cyclosm.org/">CyclOSM</a>'
        }).addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        });
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;

        form.classList.remove('hidden');
        form.style.display = 'grid';

        setTimeout(() => {
            inputDistance.focus();
        }, 100);
    }

    _hideForm() {
        inputDistance.value = inputTime.value = inputPace.value = inputElevation.value = '';

        form.style.display = 'none';
        form.classList.add('hidden');
    }

    _toggleElevationInput() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputPace.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {
        e.preventDefault();

        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const positiveInputs = (...inputs) => inputs.every(inp => inp > 0);

        const type = inputType.value;
        const distance = +inputDistance.value;
        const time = +inputTime.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;

        if (type === 'running') {
            const pace = +inputPace.value;

            if (!validInputs(distance, time, pace) || !positiveInputs(distance, time, pace)) {
                return showError('Valid and positive numbers are allowed');
            }

            workout = new Running([lat, lng], distance, time, pace);
        }

        if (type === "cycling") {
            const elevation = +inputElevation.value;

            if (!validInputs(distance, time, elevation) || !positiveInputs(distance, time)) {
                return showError('Valid and positive numbers are allowed');
            }

            workout = new Cycling([lat, lng], distance, time, elevation);
        }

        this.#workouts.push(workout);

        this._renderWorkout(workout);
        this._renderWorkoutMarker(workout);
        this._hideForm();
        this._setLocalStorage();
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords, { riseOnHover: true }).addTo(this.#map)
            .bindPopup(L.popup({
                maxWidth: 300,
                minWidth: 150,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`
            }))
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'} ${workout.description}`)
            .openPopup();
    }

    _renderWorkout(workout) {
        let html = `
            <li class="activity activity--${workout.type}" data-id="${workout.id}">
                <h2 class="activity__title">${workout.description}</h2>
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
            </li>`;
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
            </li>`;
        }

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
    }

    reset() {
        localStorage.removeItem('activities');
        location.reload();
    }
}

const app = new App();

/***** Show and close info ********/
info.addEventListener('click', function () {
    tooltip.style.transition = 'opacity 0.5s ease';
    tooltip.style.opacity = isInfoVisible ? '0' : '1';
    tooltip.style.visibility = isInfoVisible ? 'hidden' : 'visible';
    isInfoVisible = !isInfoVisible;
});

closeButton.addEventListener('click', function () {
    tooltip.style.transition = 'opacity 0.5s ease';
    tooltip.style.opacity = '0';
    tooltip.style.visibility = 'hidden';
    isInfoVisible = false;
});
