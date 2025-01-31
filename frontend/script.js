// Element references
const regionInputField = document.getElementById('regionInput');
const regionDropdown = document.getElementById('regionSuggestions');
const stopInputField = document.getElementById('stopInput');
const stopDropdown = document.getElementById('stopSuggestions');
const resultsContainer = document.getElementById('results');
const resetButton = document.getElementById('clearButton');
const busDetailsContainer = document.getElementById('busDetails');


// Data storage
let activeFetchController = null;
let isBackPressed = false;
let availableRegions = [];
let availableStops = [];
let currentBusSelection = null;
let hasManuallyCleared = false;

// Show loading animation
function displayLoadingIndicator() {
    const loader = document.getElementById('loadingIndicator');
    loader.style.display = 'block';
}

// Hide loading animation
function hideLoadingIndicator() {
    const loader = document.getElementById('loadingIndicator');
    loader.style.display = 'none';
}

// Validate input fields
function validateFormInputs() {
    let isFormValid = true;
    return isFormValid;
}




// Attach event listeners to dynamically clear input field errors
function attachErrorClearHandler(inputElement, errorElement) {
    inputElement.addEventListener('input', () => {
        if (inputElement.value.trim() !== '') {
            errorElement.textContent = '';
        }
    });
}


// Fetch and load regions
async function fetchRegions() {
    try {
        displayLoadingIndicator();
        const response = await fetch('http://localhost:3000/regions');
        availableRegions = await response.json();
        console.log('Regions retrieved:', availableRegions);
    } catch (error) {
        console.error('Failed to load regions:', error);
    } finally {
        hideLoadingIndicator();
    }
}

// Reset all input fields and clear UI elements
function resetAllFields() {
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.click();
    }

    regionInputField.value = '';
    stopInputField.value = '';
    stopInputField.disabled = true;
    regionDropdown.innerHTML = '';
    stopDropdown.innerHTML = '';
    resultsContainer.innerHTML = '';
    busDetailsContainer.innerHTML = '';
    currentBusSelection = null;
    hasManuallyCleared = true;

    validateFormInputs();
}

// Attach reset functionality to the reset button
resetButton.addEventListener('click', resetAllFields);

function updateDropdown(inputElement, dropdownContainer, items, onSelect) {
    const searchTerm = inputElement.value.trim().toLowerCase();
    dropdownContainer.innerHTML = '';

    // Filter items to only include those that match the search term
    const filteredItems = items.filter(item => 
        item.toLowerCase().includes(searchTerm)
    );

    if (filteredItems.length === 0) {
        // Show "No matching stops" if no matches are found
        const noResultsItem = document.createElement('li');
        noResultsItem.textContent = 'No matching stops found';
        noResultsItem.className = 'no-results';
        dropdownContainer.appendChild(noResultsItem);
    } else {
        // Create a dropdown list of matching items
        filteredItems.forEach(item => {
            const listItem = document.createElement('li');
            listItem.textContent = item;
            listItem.className = 'dropdown-item';
            listItem.addEventListener('mousedown', (event) => {
                event.preventDefault();
                inputElement.value = item;
                onSelect(item);
                dropdownContainer.style.display = 'none';
            });

            dropdownContainer.appendChild(listItem);
        });
    }

    // Display the dropdown only if there are matching items
    dropdownContainer.style.display = filteredItems.length > 0 ? 'block' : 'none';
}


// Handle region input changes
regionInputField.addEventListener('focus', () => {
    updateDropdown(regionInputField, regionDropdown, availableRegions, (selectedRegion) => {
        resetOnRegionChange(selectedRegion);
        loadStops(selectedRegion);
    });
});

regionInputField.addEventListener('input', () => {
    updateDropdown(regionInputField, regionDropdown, availableRegions, (selectedRegion) => {
        resetOnRegionChange(selectedRegion);
        loadStops(selectedRegion);
    });
});

stopInputField.addEventListener('input', () => {
    updateDropdown(stopInputField, stopDropdown, availableStops, selectedStop => {
        fetchBuses(selectedStop);
    });
});

// Clear fields and UI when a new region is selected
function resetOnRegionChange(region) {
    stopInputField.value = '';
    stopInputField.disabled = true;
    stopDropdown.innerHTML = '';
    resultsContainer.innerHTML = '';
    busDetailsContainer.innerHTML = '';
    currentBusSelection = null;
}

// Fetch and display stops for the selected region
async function loadStops(region) {
    try {
        displayLoadingIndicator();
        const response = await fetch(`http://localhost:3000/stops?region=${region}`);
        availableStops = await response.json();
        console.log(`Stops in region ${region} loaded:`, availableStops);
        stopDropdown.innerHTML = '';
        stopInputField.disabled = false;
    } catch (error) {
        console.error('Failed to load stops:', error);
    } finally {
        hideLoadingIndicator();
    }
}

// Render bus options horizontally
function renderBusesHorizontally(buses) {
    resultsContainer.innerHTML = '<h3>Buses:</h3>';

    if (!buses.length) {
        resultsContainer.innerHTML += '<p>No buses available.</p>';
        return;
    }

    const busList = document.createElement('ul');
    busList.className = 'bus-list-horizontal';

    buses.forEach(bus => {
        const listItem = document.createElement('li');
        const busButton = document.createElement('button');
        busButton.textContent = bus;
        busButton.className = 'bus-button';

        // Add click event to fetch and display bus schedule details
        busButton.addEventListener('click', async () => {
            const selectedStop = stopInputField.value.trim();
            if (!selectedStop) {
                console.error("No stop selected.");
                return;
            }

            await displaySelectedBusDetails(bus, selectedStop);
        });

        listItem.appendChild(busButton);
        busList.appendChild(listItem);
    });

    resultsContainer.appendChild(busList);
}

// Fetch and render buses for a selected stop
async function fetchBuses(stop) {
    const selectedRegion = regionInputField.value.trim();

    if (!selectedRegion || !stop) {
        console.error("Region or stop not provided.");
        return;
    }

    // Скрыть контейнер до завершения загрузки
    resultsContainer.style.display = 'none';

    try {
        displayLoadingIndicator();
        const response = await fetch(
            `http://localhost:3000/buses?stop=${encodeURIComponent(stop)}&region=${encodeURIComponent(selectedRegion)}`
        );

        if (!response.ok) {
            console.error("Failed to fetch buses:", response.statusText);
            resultsContainer.innerHTML = `<p>Error loading buses. Please try again later.</p>`;
            return;
        }

        const buses = await response.json();
        console.log(`Buses for region "${selectedRegion}" and stop "${stop}" loaded:`, buses);

        renderBusesHorizontally(buses);
        resultsContainer.style.display = 'block'; // Показать контейнер после загрузки
    } catch (error) {
        console.error("Error fetching buses:", error);
        resultsContainer.innerHTML = `<p>An unexpected error occurred.</p>`;
    } finally {
        hideLoadingIndicator();
    }
}

// Fetch bus schedule details
async function fetchBusScheduleDetails(bus, stop) {
    if (!bus || !stop) {
        console.error("Invalid bus or stop provided.");
        return;
    }

    // Отменяем предыдущий запрос, если он существует
    if (activeFetchController) {
        activeFetchController.abort();
    }

    // Создаём новый контроллер для текущего запроса
    activeFetchController = new AbortController();
    const signal = activeFetchController.signal;

    try {
        displayLoadingIndicator(); // Показываем индикатор загрузки

        const response = await fetch(`http://localhost:3000/bus-details?bus=${bus}&stop=${stop}`, { signal });
        const scheduleDetails = await response.json();

        // Проверяем, была ли нажата кнопка "Back"
        if (isBackPressed) {
            console.log('Request cancelled or ignored due to back button press.');
            return; // Выходим, если запрос больше не актуален
        }

        if (scheduleDetails.length === 0) {
            busDetailsContainer.innerHTML = `<p>No schedule details found for bus ${bus} at stop ${stop}.</p>`;
            return;
        }

        renderBusDetails(scheduleDetails); // Отображаем детали маршрутов
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Request cancelled.');
        } else {
            console.error("Error fetching bus schedule details:", error);
            busDetailsContainer.innerHTML = `<p>Failed to load schedule details. Try again later.</p>`;
        }
    } finally {
        hideLoadingIndicator(); // Скрываем индикатор загрузки
        activeFetchController = null; // Сбрасываем контроллер
    }
}


// Handle bus selection and display its schedule
async function displaySelectedBusDetails(bus, stop) {
    if (!bus || !stop) {
        console.error("Invalid bus or stop selected.");
        return;
    }

    // Сбрасываем флаг "Back"
    isBackPressed = false;

    resultsContainer.style.display = 'none'; // Скрываем список автобусов

    // Показываем индикатор загрузки
    displayLoadingIndicator();

    // Удаляем предыдущую кнопку "Back", если она существует
    const existingBackButton = document.getElementById('backButton');
    if (existingBackButton) {
        existingBackButton.remove();
    }

    // Создаём кнопку "Back"
    const backButton = document.createElement('button');
    backButton.id = 'backButton';
    backButton.textContent = 'Back';
    backButton.className = 'btn btn-danger';
    backButton.addEventListener('click', () => {
        // Устанавливаем флаг "Back"
        isBackPressed = true;

        // Отмена текущего запроса
        if (activeFetchController) {
            activeFetchController.abort();
        }

        resultsContainer.style.display = 'block'; // Показываем список автобусов
        backButton.remove(); // Удаляем кнопку "Back"
        busDetailsContainer.innerHTML = ''; // Очищаем детали маршрутов
    });

    resultsContainer.parentElement.insertBefore(backButton, busDetailsContainer);

    try {
        await fetchBusScheduleDetails(bus, stop); // Загружаем данные маршрутов
    } catch (error) {
        console.error("Error displaying bus details:", error);
    } finally {
        hideLoadingIndicator(); // Скрываем индикатор загрузки
    }
}


// Render bus schedule details grouped by direction
function renderBusDetails(details) {
    const uniqueDetails = [...new Map(details.map(detail => [`${detail.arrival_time}-${detail.trip_long_name}`, detail])).values()];

    const groupedByDirection = uniqueDetails.reduce((acc, detail) => {
        const direction = detail.trip_long_name;
        if (!acc[direction]) acc[direction] = [];
        acc[direction].push(detail);
        return acc;
    }, {});

    busDetailsContainer.innerHTML = '';
    Object.entries(groupedByDirection).forEach(([direction, schedule]) => {
        const sortedSchedule = schedule.sort((a, b) => a.arrival_time.localeCompare(b.arrival_time));
        const scheduleItems = sortedSchedule.map(item => `<li>${item.arrival_time}</li>`).join('');
        busDetailsContainer.innerHTML += `<h5>Direction: ${direction}</h5><ul>${scheduleItems}</ul>`;
    });
}



// Handle input field focus and update stop suggestions
stopInputField.addEventListener('focus', () => {
    updateDropdown(stopInputField, stopDropdown, availableStops, selectedStop => {
        fetchBuses(selectedStop);
    });
});

// Load initial data on page load
document.addEventListener('DOMContentLoaded', async () => {
    resultsContainer.style.display = 'none'; // Скрыть контейнер на начальном этапе

    await fetchRegions();

    regionInputField.disabled = false;
    stopInputField.disabled = false;

    if (regionInputField.value.trim()) {
        const initialRegion = regionInputField.value.trim();
        await loadStops(initialRegion);

        if (availableStops.length > 0) {
            const defaultStop = availableStops[0];
            stopInputField.value = defaultStop;
            stopInputField.disabled = false;
            await fetchBuses(defaultStop);
        }
    }

    document.addEventListener('click', (event) => {
        const isClickInsideRegion = regionInputField.contains(event.target) || regionDropdown.contains(event.target);
        const isClickInsideStop = stopInputField.contains(event.target) || stopDropdown.contains(event.target);

        if (!isClickInsideRegion) {
            regionDropdown.style.display = 'none';
        }

        if (!isClickInsideStop) {
            stopDropdown.style.display = 'none';
        }
    });

    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            async position => {
                const { latitude, longitude } = position.coords;

                try {
                    const response = await fetch(`http://localhost:3000/nearest?lat=${latitude}&lon=${longitude}`);
                    const nearestData = await response.json();

                    regionInputField.value = nearestData.region;
                    stopInputField.value = nearestData.stop;
                    stopInputField.disabled = false;

                    await loadStops(nearestData.region);
                    await fetchBuses(nearestData.stop);
                } catch (error) {
                    console.error("Error fetching nearest stop:", error);
                }
            },
            error => {
                console.error("Geolocation error:", error.message);
            }
        );
    }
});


