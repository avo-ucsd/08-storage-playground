// LocalStorage Recipe Manager Implementation

// DOM Elements
const recipeForm = document.getElementById('recipeForm');
const recipeCards = document.getElementById('recipeCards');
const recipeModal = document.getElementById('recipeModal');
const recipeDetails = document.getElementById('recipeDetails');
const modalClose = document.querySelector('.close');
const importBtn = document.getElementById('importBtn');
const jsonImport = document.getElementById('jsonImport');

// LocalStorage Key
const STORAGE_KEY = 'recipes';

// Recipe Class
class RecipeManager {
  constructor() {
    this.recipes = this.loadRecipes();
    this.bindEvents();
    this.renderRecipes();
  }

  loadRecipes() {
    const storedRecipes = localStorage.getItem(STORAGE_KEY);
    return storedRecipes ? JSON.parse(storedRecipes) : [];
  }

  saveRecipes() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.recipes));
  }

  addRecipe(recipe) {
    recipe.id = Date.now().toString();
    this.recipes.push(recipe);
    this.saveRecipes();
    this.renderRecipes();
  }

  importRecipes(recipesArray) {
    if (!Array.isArray(recipesArray)) {
      recipesArray = [recipesArray];
    }
    
    recipesArray.forEach(recipe => {
      recipe.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
      this.recipes.push(recipe);
    });
    
    this.saveRecipes();
    this.renderRecipes();
  }

  renderRecipes() {
    recipeCards.innerHTML = '';
    
    this.recipes.forEach(recipe => {
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

  showRecipeDetails(id) {
    const recipe = this.recipes.find(r => r.id === id);
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

  bindEvents() {
    // Form submission
    recipeForm.addEventListener('submit', (e) => {
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
      
      this.addRecipe(recipe);
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
      reader.onload = (e) => {
        try {
          const recipes = JSON.parse(e.target.result);
          this.importRecipes(recipes);
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