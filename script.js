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

    /***** Classes ********/

    class App {
        #map;
        #mapEvent;

        constructor() {
            this._getPosition();

            form.addEventListener('submit', this._newWorkout.bind(this));

            inputType.addEventListener('change', function () {
                inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
                inputPace.closest('.form__row').classList.toggle('form__row--hidden');
            })
        }

        _getPosition() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
                    alert('Could not get your current location');
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

        }

        _newWorkout(e) {
            e.preventDefault();

            inputDistance.value = inputTime.value = inputPace.value = inputElevation.value = '';

            if (isInfoVisible) {
                const { lat, lng } = this.#mapEvent.latlng;

                L.marker([lat, lng], { riseOnHover: true }).addTo(this.#map)
                    .bindPopup(L.popup({
                        maxWidth: 300,
                        minWidth: 150,
                        autoClose: false,
                        closeOnClick: false,
                        className: 'running-popup'
                    }))
                    .setPopupContent('Workout')
                    .openPopup();
            }
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

    /***** Geolocation ********/


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
