// IndexedDB Recipe Manager Implementation with ShadowDOM

// Recipe Class
class RecipeManager {
  constructor() {
    this.db = null;
    this.sortField = 'name';
    this.sortDirection = 'asc';
    this.shadowRoot = null;
    
    // Initialize ShadowDOM
    this.initShadowDOM();
    
    this.initDatabase()
      .then(() => {
        this.bindEvents();
        this.renderRecipes();
      })
      .catch(error => {
        console.error('Database initialization failed:', error);
      });
  }

  // Initialize the ShadowDOM
  initShadowDOM() {
    // Create a container for the shadow DOM
    const shadowContainer = document.getElementById('recipeCards');
    
    // Attach shadow DOM to the container
    this.shadowRoot = shadowContainer.attachShadow({ mode: 'open' });
    
    // Create initial structure
    this.shadowRoot.innerHTML = `
      <style>
        .recipe-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
          cursor: pointer;
          transition: transform 0.2s ease;
          background-color: white;
        }
        
        .recipe-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .recipe-card h3 {
          margin-top: 0;
          color: #333;
        }
        
        .recipe-card p {
          color: #666;
        }
        
        .recipe-meta {
          font-size: 0.85em;
          color: #888;
          margin-top: 10px;
        }
        
        .sort-info {
          margin-bottom: 15px;
          padding: 10px;
          background-color: #f0f0f0;
          border-radius: 4px;
          font-size: 0.9em;
        }
        
        .sort-info p {
          margin: 0;
          color: #555;
        }
      </style>
      <div id="shadow-recipe-cards"></div>
    `;
  }

  // Initialize the IndexedDB
  initDatabase() {
    return new Promise((resolve, reject) => {
      const DB_NAME = 'RecipeDatabase';
      const DB_VERSION = 1;
      const RECIPE_STORE = 'recipes';
      
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = event => {
        console.error('IndexedDB error:', event.target.error);
        reject('Could not open IndexedDB');
      };
      
      request.onsuccess = event => {
        this.db = event.target.result;
        resolve();
      };
      
      request.onupgradeneeded = event => {
        const db = event.target.result;
        
        // Create object store with auto-increment id
        if (!db.objectStoreNames.contains(RECIPE_STORE)) {
          const store = db.createObjectStore(RECIPE_STORE, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('datePublished', 'datePublished', { unique: false });
          store.createIndex('cookTime', 'cookTime', { unique: false });
          store.createIndex('prepTime', 'prepTime', { unique: false });
          store.createIndex('totalTime', 'totalTime', { unique: false });
        }
      };
    });
  }

  // Perform a database transaction
  async performTransaction(storeName, mode, callback) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      
      const request = callback(store);
      
      if (request) {
        request.onsuccess = event => resolve(event.target.result);
        request.onerror = event => reject(event.target.error);
      }
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = event => reject(event.target.error);
    });
  }

  // Get all recipes from database with sorting
  async getRecipes(sortField = this.sortField, sortDirection = this.sortDirection) {
    // Store the current sort parameters
    this.sortField = sortField;
    this.sortDirection = sortDirection;
    
    console.log(`Getting recipes with sort: ${sortField}, direction: ${sortDirection}`);
    
    const recipes = await this.performTransaction('recipes', 'readonly', store => {
      // Always get all recipes regardless of sorting for now
      return store.getAll();
    });
    
    // Sort the recipes
    return this.sortRecipes(recipes, sortField, sortDirection);
  }
  
  // Sort recipes based on specified field and direction
  sortRecipes(recipes, sortField, sortDirection) {
    console.log(`Sorting ${recipes.length} recipes by ${sortField} in ${sortDirection} order`);
    
    return recipes.sort((a, b) => {
      let valueA = a[sortField] || '';
      let valueB = b[sortField] || '';
      
      console.log(`Comparing: ${valueA} vs ${valueB}`);
      
      // Special handling for time fields (PT1H30M format)
      if (sortField === 'prepTime' || sortField === 'cookTime' || sortField === 'totalTime') {
        valueA = this.convertTimeToMinutes(valueA);
        valueB = this.convertTimeToMinutes(valueB);
      }
      
      // For date fields, convert to Date objects
      if (sortField === 'datePublished') {
        valueA = valueA ? new Date(valueA) : new Date(0);
        valueB = valueB ? new Date(valueB) : new Date(0);
      }
      
      // Compare values based on sort direction
      if (sortDirection === 'asc') {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    });
  }
  
  // Convert ISO time format (PT1H30M) to minutes for sorting
  convertTimeToMinutes(timeString) {
    if (!timeString || typeof timeString !== 'string') return 0;
    
    let minutes = 0;
    const hourMatch = timeString.match(/(\d+)H/);
    const minuteMatch = timeString.match(/(\d+)M/);
    
    if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
    if (minuteMatch) minutes += parseInt(minuteMatch[1]);
    
    return minutes;
  }

  // Add a recipe to database
  async addRecipe(recipe) {
    recipe.id = Date.now().toString();
    await this.performTransaction('recipes', 'readwrite', store => {
      return store.add(recipe);
    });
    await this.renderRecipes();
  }

  // Import recipes from JSON
  async importRecipes(recipesArray) {
    if (!Array.isArray(recipesArray)) {
      recipesArray = [recipesArray];
    }
    
    const transaction = this.db.transaction('recipes', 'readwrite');
    const store = transaction.objectStore('recipes');
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = async () => {
        await this.renderRecipes();
        resolve();
      };
      
      transaction.onerror = event => {
        reject(event.target.error);
      };
      
      recipesArray.forEach(recipe => {
        recipe.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        store.add(recipe);
      });
    });
  }

  // Render all recipes to the ShadowDOM
  async renderRecipes(sortField = this.sortField, sortDirection = this.sortDirection) {
    // Update the sort parameters
    this.sortField = sortField;
    this.sortDirection = sortDirection;
    
    const recipes = await this.getRecipes(sortField, sortDirection);
    
    // Clear existing recipe cards in shadow DOM
    const shadowCards = this.shadowRoot.getElementById('shadow-recipe-cards');
    shadowCards.innerHTML = '';
    
    // Display sorting information
    const sortInfo = document.createElement('div');
    sortInfo.className = 'sort-info';
    sortInfo.innerHTML = `<p>Sorted by: ${sortField} (${sortDirection === 'asc' ? 'ascending' : 'descending'})</p>`;
    shadowCards.appendChild(sortInfo);
    
    // Render recipes
    recipes.forEach(recipe => {
      const card = document.createElement('div');
      card.className = 'recipe-card';
      card.dataset.id = recipe.id;
      
      // Format time values for display
      const prepTimeFormatted = this.formatTimeDisplay(recipe.prepTime);
      const cookTimeFormatted = this.formatTimeDisplay(recipe.cookTime);
      
      card.innerHTML = `
        <h3>${recipe.name}</h3>
        <p>${recipe.description.length > 100 
          ? recipe.description.substring(0, 100) + '...' 
          : recipe.description}</p>
        <div class="recipe-meta">
          ${prepTimeFormatted ? `<span>Prep: ${prepTimeFormatted}</span> | ` : ''}
          ${cookTimeFormatted ? `<span>Cook: ${cookTimeFormatted}</span>` : ''}
        </div>
      `;
      
      card.addEventListener('click', () => this.showRecipeDetails(recipe.id));
      shadowCards.appendChild(card);
    });
  }
  
  // Format time for display (convert PT1H30M to 1h 30m)
  formatTimeDisplay(timeString) {
    if (!timeString || typeof timeString !== 'string') return '';
    
    let formattedTime = '';
    const hourMatch = timeString.match(/(\d+)H/);
    const minuteMatch = timeString.match(/(\d+)M/);
    
    if (hourMatch) formattedTime += `${hourMatch[1]}h `;
    if (minuteMatch) formattedTime += `${minuteMatch[1]}m`;
    
    return formattedTime.trim();
  }

  // Show recipe details in modal
  async showRecipeDetails(id) {
    const recipe = await this.performTransaction('recipes', 'readonly', store => {
      return store.get(id);
    });
    
    if (!recipe) return;
    
    // Format ingredients and instructions as lists
    const ingredients = Array.isArray(recipe.recipeIngredient) 
      ? recipe.recipeIngredient 
      : recipe.recipeIngredient.split('\n').filter(item => item.trim() !== '');
      
    const instructions = Array.isArray(recipe.recipeInstructions) 
      ? recipe.recipeInstructions 
      : recipe.recipeInstructions.split('\n').filter(item => item.trim() !== '');
    
    const recipeDetails = document.getElementById('recipeDetails');
    recipeDetails.innerHTML = `
      <h2>${recipe.name}</h2>
      
      ${recipe.image ? `<img src="${recipe.image}" alt="${recipe.name}" style="max-width: 100%; margin-bottom: 15px;">` : ''}
      
      <div class="recipe-detail-section">
        <p><strong>Author:</strong> ${recipe.author}</p>
        <p><strong>Published:</strong> ${recipe.datePublished || 'Not specified'}</p>
        <p><strong>Category:</strong> ${recipe.recipeCategory || 'Not specified'}</p>
        <p><strong>Cuisine:</strong> ${recipe.recipeCuisine || 'Not specified'}</p>
        <p><strong>Prep Time:</strong> ${this.formatTimeDisplay(recipe.prepTime) || 'Not specified'}</p>
        <p><strong>Cook Time:</strong> ${this.formatTimeDisplay(recipe.cookTime) || 'Not specified'}</p>
        <p><strong>Total Time:</strong> ${this.formatTimeDisplay(recipe.totalTime) || 'Not specified'}</p>
      </div>
      
      <div class="recipe-detail-section">
        <h3>Description</h3>
        <p>${recipe.description}</p>
      </div>
      
      <div class="recipe-detail-section">
        <h3>Ingredients</h3>
        <ul class="recipe-ingredients">
          ${ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
        </ul>
      </div>
      
      <div class="recipe-detail-section">
        <h3>Instructions</h3>
        <ol class="recipe-instructions">
          ${instructions.map(instruction => `<li>${instruction}</li>`).join('')}
        </ol>
      </div>
    `;
    
    const recipeModal = document.getElementById('recipeModal');
    recipeModal.style.display = 'block';
  }

  // Bind event listeners
  bindEvents() {
    // Form submission
    const recipeForm = document.getElementById('recipeForm');
    recipeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(recipeForm);
      const recipe = {
        '@context': 'https://schema.org/',
        '@type': 'Recipe'
      };
      
      // Convert form data to recipe object
      for (const [key, value] of formData.entries()) {
        if (key === 'recipeIngredient' || key === 'recipeInstructions') {
          recipe[key] = value.split('\n').filter(item => item.trim() !== '');
        } else {
          recipe[key] = value;
        }
      }
      
      // Set date published if not provided
      if (!recipe.datePublished) {
        const today = new Date();
        recipe.datePublished = today.toISOString().split('T')[0];
      }
      
      await this.addRecipe(recipe);
      recipeForm.reset();
    });
    
    // Close modal
    const modalClose = document.querySelector('.close');
    modalClose.addEventListener('click', () => {
      const recipeModal = document.getElementById('recipeModal');
      recipeModal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
      const recipeModal = document.getElementById('recipeModal');
      if (e.target === recipeModal) {
        recipeModal.style.display = 'none';
      }
    });
    
    // Import JSON
    const importBtn = document.getElementById('importBtn');
    const jsonImport = document.getElementById('jsonImport');
    importBtn.addEventListener('click', () => {
      const file = jsonImport.files[0];
      if (!file) {
        alert('Please select a JSON file to import');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const recipes = JSON.parse(e.target.result);
          await this.importRecipes(recipes);
          jsonImport.value = '';
        } catch (error) {
          alert('Invalid JSON file. Please check the format and try again.');
          console.error('Import error:', error);
        }
      };
      
      reader.readAsText(file);
    });
    
    // Sort button
    const sortBtn = document.getElementById('sortBtn');
    sortBtn.addEventListener('click', () => {
      const sortField = document.getElementById('sortBy').value;
      const sortDirection = document.getElementById('sortDirection').value;
      console.log(`Sort button clicked: ${sortField}, ${sortDirection}`);
      this.renderRecipes(sortField, sortDirection);
    });
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  new RecipeManager();
});