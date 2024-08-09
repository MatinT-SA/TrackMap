document.addEventListener('DOMContentLoaded', () => {

    /***** Selecting DOM elements ********/
    const info = document.getElementById('info');
    const map = document.getElementById('map');
    const closeButton = document.getElementById('close-btn');
    const tooltip = document.querySelector('.tooltip');
    const body = document.body;
    const dockDistance = 70;

    window.showInfo = () => {
        info.style.display = 'block';
        tooltip.style.display = 'none';
        body.classList.add('no-animations');
    };

    const hideInfo = () => {
        info.style.display = 'none';
        tooltip.style.display = 'block';
        body.classList.remove('no-animations');
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

    map.addEventListener('click', () => {
        if (info.style.display === 'none') {
            window.showInfo();
        }
    });

    /***** Geolocation ********/
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            const { latitude } = position.coords;
            const { longitude } = position.coords;
            console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
        }, function () {
            alert('Could not get your current location');
        })
    }



});
