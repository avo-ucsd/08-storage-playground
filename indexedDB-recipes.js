// IndexedDB Recipe Manager Implementation

// DOM Elements
const recipeForm = document.getElementById('recipeForm');
const recipeCards = document.getElementById('recipeCards');
const recipeModal = document.getElementById('recipeModal');
const recipeDetails = document.getElementById('recipeDetails');
const modalClose = document.querySelector('.close');
const importBtn = document.getElementById('importBtn');
const jsonImport = document.getElementById('jsonImport');

// IndexedDB Configuration
const DB_NAME = 'RecipeDatabase';
const DB_VERSION = 1;
const RECIPE_STORE = 'recipes';

// Recipe Class
class RecipeManager {
  constructor() {
    this.db = null;
    this.initDatabase()
      .then(() => {
        this.bindEvents();
        this.renderRecipes();
      })
      .catch(error => {
        console.error('Database initialization failed:', error);
      });
  }

  // Initialize the IndexedDB
  initDatabase() {
    return new Promise((resolve, reject) => {
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

  // Get all recipes from database
  async getAllRecipes() {
    return this.performTransaction(RECIPE_STORE, 'readonly', store => {
      return store.getAll();
    });
  }

  // Add a recipe to database
  async addRecipe(recipe) {
    recipe.id = Date.now().toString();
    await this.performTransaction(RECIPE_STORE, 'readwrite', store => {
      return store.add(recipe);
    });
    await this.renderRecipes();
  }

  // Import recipes from JSON
  async importRecipes(recipesArray) {
    if (!Array.isArray(recipesArray)) {
      recipesArray = [recipesArray];
    }
    
    const transaction = this.db.transaction(RECIPE_STORE, 'readwrite');
    const store = transaction.objectStore(RECIPE_STORE);
    
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

  // Render all recipes to the UI
  async renderRecipes() {
    const recipes = await this.getAllRecipes();
    recipeCards.innerHTML = '';
    
    recipes.forEach(recipe => {
      const card = document.createElement('div');
      card.className = 'recipe-card';
      card.dataset.id = recipe.id;
      
      card.innerHTML = `
        <h3>${recipe.name}</h3>
        <p>${recipe.description.length > 100 
          ? recipe.description.substring(0, 100) + '...' 
          : recipe.description}</p>
      `;
      
      card.addEventListener('click', () => this.showRecipeDetails(recipe.id));
      recipeCards.appendChild(card);
    });
  }

  // Show recipe details in modal
  async showRecipeDetails(id) {
    const recipe = await this.performTransaction(RECIPE_STORE, 'readonly', store => {
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
    
    recipeDetails.innerHTML = `
      <h2>${recipe.name}</h2>
      
      ${recipe.image ? `<img src="${recipe.image}" alt="${recipe.name}" style="max-width: 100%; margin-bottom: 15px;">` : ''}
      
      <div class="recipe-detail-section">
        <p><strong>Author:</strong> ${recipe.author}</p>
        <p><strong>Published:</strong> ${recipe.datePublished || 'Not specified'}</p>
        <p><strong>Category:</strong> ${recipe.recipeCategory || 'Not specified'}</p>
        <p><strong>Cuisine:</strong> ${recipe.recipeCuisine || 'Not specified'}</p>
        <p><strong>Prep Time:</strong> ${recipe.prepTime || 'Not specified'}</p>
        <p><strong>Cook Time:</strong> ${recipe.cookTime || 'Not specified'}</p>
        <p><strong>Total Time:</strong> ${recipe.totalTime || 'Not specified'}</p>
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
    
    recipeModal.style.display = 'block';
  }

  // Bind event listeners
  bindEvents() {
    // Form submission
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
    modalClose.addEventListener('click', () => {
      recipeModal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
      if (e.target === recipeModal) {
        recipeModal.style.display = 'none';
      }
    });
    
    // Import JSON
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
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  new RecipeManager();
});