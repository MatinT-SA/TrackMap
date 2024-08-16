document.addEventListener('DOMContentLoaded', () => {

    /***** Selecting DOM elements ********/

    const info = document.getElementById('info');
    const mapElement = document.getElementById('map');
    const closeButton = document.getElementById('close-btn');
    const tooltip = document.querySelector('.tooltip');
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
    let map, mapEvent;

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
        type = 'cycling'
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

        constructor() {
            this._getPosition();

            form.addEventListener('submit', this._newWorkout.bind(this));

            inputType.addEventListener('change', this._toggleElevationInput);
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

            this.#map = L.map('map').setView(coords, 14);

            L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
                maxZoom: 20,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://cyclosm.org/">CyclOSM</a>'
            }).addTo(this.#map);

            this.#map.on('click', this._showForm.bind(this));
        }

        _showForm(mapE) {
            this.#mapEvent = mapE;

            setTimeout(() => {
                inputDistance.focus();
            }, 100);
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

                if (
                    !validInputs(distance, time, pace) || !positiveInputs(distance, time, pace)
                ) {
                    return showError('Valid and positive numbers are allowed');
                }

                workout = new Running([lat, lng], distance, time, pace);
            }

            if (type === "cycling") {
                const elevation = +inputElevation.value;

                if (
                    !validInputs(distance, time, elevation) || !positiveInputs(distance, time)
                ) {
                    return showError('Valid and positive numbers are allowed');
                }

                workout = new Cycling([lat, lng], distance, time, elevation);
            }

            this.#workouts.push(workout);

            inputDistance.value = inputTime.value = inputPace.value = inputElevation.value = '';

            this._renderWorkout(workout);

            this._renderWorkoutMarker(workout);
        }

        /***** Geolocation ********/
        _renderWorkoutMarker(workout) {
            if (isInfoVisible) {
                L.marker(workout.coords, { riseOnHover: true }).addTo(this.#map)
                    .bindPopup(L.popup({
                        maxWidth: 300,
                        minWidth: 150,
                        autoClose: false,
                        closeOnClick: false,
                        className: `${workout.type}-popup`
                    }))
                    .setPopupContent('Workout')
                    .openPopup();
            }
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
                        <span class="activity__icon">⏱</span>
                        <span class="activity__value">${workout.time}</span>
                        <span class="activity__unit">min</span>
                    </div>
            `;

            if (workout.type === 'running')
                html += `
                <div class="activity__details">
                    <span class="activity__icon">⚡️</span>
                    <span class="activity__value">${workout.paceRunning.toFixed(1)}</span>
                    <span class="activity__unit">min/km</span>
                </div>
                <div class="activity__details">
                    <span class="activity__icon">🦶🏼</span>
                    <span class="activity__value">${workout.pace}</span>
                    <span class="activity__unit">spm</span>
                </div>
            </li>
            `;

            if (workout.type === 'cycling')
                html += `
                <div class="activity__details">
                    <span class="activity__icon">⚡️</span>
                    <span class="activity__value">${workout.speed.toFixed(1)}</span>
                    <span class="activity__unit">km/h</span>
                </div>
                <div class="activity__details">
                    <span class="activity__icon">⛰</span>
                    <span class="activity__value">${workout.elevation}</span>
                    <span class="activity__unit">m</span>
                </div>
            </li>
            `;

            form.insertAdjacentHTML('afterend', html);
        }
    }

    const app = new App();

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

    info.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialX = info.offsetLeft;
        initialY = info.offsetTop;
        info.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const newLeft = initialX + dx;
            const newTop = initialY + dy;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const infoRect = info.getBoundingClientRect();
            const newRight = newLeft + infoRect.width;
            const newBottom = newTop + infoRect.height;

            if (newLeft < 0) {
                info.style.left = '0px';
            } else if (newRight > viewportWidth) {
                info.style.left = `${viewportWidth - infoRect.width}px`;
            } else {
                info.style.left = `${newLeft}px`;
            }

            if (newTop < 0) {
                info.style.top = '0px';
            } else if (newBottom > viewportHeight) {
                info.style.top = `${viewportHeight - infoRect.height}px`;
            } else {
                info.style.top = `${newTop}px`;
            }
        }
    });

    document.addEventListener('mouseup', () => {
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



});
