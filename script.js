const mapWidth = 948;
const mapHeight = 844;

const longitudeRange = ["-121.781739849809", "-122.50685"];
const latitudeRange = ["37.22070801115405", "37.820673"];

let circleAPosition = { x: 200, y: 200 };
let circleBPosition = { x: 400, y: 400 };

let selectedPrices = [];

function setupPriceFilter() {
  d3.select("#price-select").on("change", function() {
    selectedPrices = Array.from(this.selectedOptions).map(option => option.value);
    updateVisualization();
  });

  d3.select("#clear-price-filter").on("click", function() {
    d3.select("#price-select").property("value", []);
    selectedPrices = [];
    updateVisualization();
  });
}

const mapFrameGeoJSON = {
  type: "Feature",
  geometry: {
    type: "LineString",
    coordinates: [
      [longitudeRange[0], latitudeRange[0]],
      [longitudeRange[1], latitudeRange[1]]
    ]
  }
};

const projection = d3.geoConicConformal()
  .parallels([37 + 4 / 60, 38 + 26 / 60])
  .rotate([120 + 30 / 60], 0)
  .fitSize([mapWidth, mapHeight], mapFrameGeoJSON);

const svg = d3.select("#map-container")
  .append("svg")
  .attr("width", mapWidth)
  .attr("height", mapHeight)
  .style("border", "1px solid black");

  svg.append("image")
  .attr("width", mapWidth)
  .attr("height", mapHeight)
  .attr("xlink:href", "data/map.png")
  .style("filter", "brightness(0.8) contrast(1.2)");

// Load and process data
d3.csv("data/cs448b-fa24-a3.csv").then(data => {
  // Process and visualize data here
  console.log("Data loaded:", data);
  
  // Call a function to add data points
  setupSliders();
  setupPriceFilter();
  addDataPoints(data);
});

function addDataPoints(data) {
  svg.selectAll("circle.restaurant")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "restaurant")
    .attr("cx", d => {
      const coords = projection([+d.longitude, +d.latitude]);
      return coords[0];
    })
    .attr("cy", d => {
      const coords = projection([+d.longitude, +d.latitude]);
      return coords[1];
    })
    .attr("r", 3)
    .attr("fill", "#3498db")
    .on("mouseover", showTooltip)
    .on("mouseout", hideTooltip);
}

function showTooltip(event, d) {
  const tooltip = d3.select("#tooltip");
  tooltip.style("display", "block")
    .html(`
      <strong>${d.name}</strong><br>
      Rating: ${d.rating || 'N/A'}<br>
      Price: ${d.price || 'N/A'}<br>
      Address: ${d.address || 'N/A'}
    `)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 10) + "px");
}

function hideTooltip() {
  d3.select("#tooltip").style("display", "none");
}

function removeAllTooltips() {
  svg.selectAll("#tooltip").remove();
}

let circleA, circleB;
let radiusA = 50, radiusB = 50;

function setupSliders() {
  d3.select("#radiusA").on("input", function() {
    const newRadius = +this.value;
    radiusA = newRadius;
    circleA.circle.attr("r", newRadius);
    d3.select("#radiusAValue").text(newRadius);
    updateVisualization();
  });

  d3.select("#radiusB").on("input", function() {
    const newRadius = +this.value;
    radiusB = newRadius;
    circleB.circle.attr("r", newRadius);
    d3.select("#radiusBValue").text(newRadius);
    updateVisualization();
  });
}

function createDraggableCircle(x, y, radius, color, positionObj) {
  const group = svg.append("g");

  const circle = group.append("circle")
    .attr("cx", x)
    .attr("cy", y)
    .attr("r", radius)
    .attr("fill", color)
    .attr("fill-opacity", 0.2)
    .attr("stroke", color)
    .attr("stroke-width", 2);

  const drag = d3.drag()
    .on("drag", function(event) {
      const cx = Math.max(radius, Math.min(mapWidth - radius, event.x));
      const cy = Math.max(radius, Math.min(mapHeight - radius, event.y));
      group.attr("transform", `translate(${cx - x}, ${cy - y})`);
      positionObj.x = cx;
      positionObj.y = cy;
      updateVisualization();
    });

  group.call(drag);

  return {group, circle};
}

function updateVisualization() {
  let intersectionCount = 0;

  svg.selectAll("circle.restaurant")
    .attr("fill", d => {
      const coords = projection([+d.longitude, +d.latitude]);
      const inCircleA = isPointInCircle(coords[0], coords[1], circleAPosition.x, circleAPosition.y, radiusA);
      const inCircleB = isPointInCircle(coords[0], coords[1], circleBPosition.x, circleBPosition.y, radiusB);
      const matchesPrice = selectedPrices.length === 0 || selectedPrices.includes(d.price);
      
      if (inCircleA && inCircleB && matchesPrice) {
        intersectionCount++;
        return "#3498db"; 
      }
      return "#bdc3c7"; 
    })
    .attr("r", d => {
      const coords = projection([+d.longitude, +d.latitude]);
      const inCircleA = isPointInCircle(coords[0], coords[1], circleAPosition.x, circleAPosition.y, radiusA);
      const inCircleB = isPointInCircle(coords[0], coords[1], circleBPosition.x, circleBPosition.y, radiusB);
      const matchesPrice = selectedPrices.length === 0 || selectedPrices.includes(d.price);
      return (inCircleA && inCircleB && matchesPrice) ? 5 : 3;
    })
    .attr("visibility", d => {
      const matchesPrice = selectedPrices.length === 0 || selectedPrices.includes(d.price);
      return matchesPrice ? "visible" : "hidden";
    });

  // Update the circles
  circleA.circle.attr("r", radiusA);
  circleB.circle.attr("r", radiusB);

  updateIntersectionCount(intersectionCount);
}

function updateIntersectionCount(count) {
  // Check if the element exists, if not, create it
  let countDisplay = d3.select("#intersection-count");
  if (countDisplay.empty()) {
    countDisplay = d3.select("#controls")
      .append("div")
      .attr("id", "intersection-count")
      .style("margin-top", "20px");
  }
  
  countDisplay.text(`Restaurants in intersection: ${count}`);
}


function isPointInCircle(x, y, centerX, centerY, radius) {
  const dx = x - centerX;
  const dy = y - centerY;
  return dx * dx + dy * dy <= radius * radius;
}

// Create the two circles
circleA = createDraggableCircle(200, 200, radiusA, "blue", circleAPosition);
circleB = createDraggableCircle(400, 400, radiusB, "blue", circleBPosition);

// Initial update
updateVisualization();
