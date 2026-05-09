const compareBtn = document.querySelector('#compareBtn');
const product1Input = document.querySelector('#product1');
const product2Input = document.querySelector('#product2');
const comparisonMessage = document.querySelector('#comparisonMessage');
const comparisonResult = document.querySelector('#comparisonResult');

async function fetchProductData(productName) {
    try {
        const response = await fetch('/api/product_comparison', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ product: productName.trim() })
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching product data:', error);
        return null;
    }
}

function displayProductCard(cardId, productData) {
    if (!productData || !productData.success) {
        document.querySelector(`#${cardId}Card`).innerHTML = 
            `<p class="error-text">Product not found. Try common items like Tomato, Onion, Rice, Wheat.</p>`;
        return;
    }

    document.querySelector(`#${cardId}Img`).src = productData.image || 'assets/market.svg';
    document.querySelector(`#${cardId}Name`).textContent = productData.name || 'Product';
    document.querySelector(`#${cardId}Price`).textContent = `₹${productData.price}/kg` || 'N/A';
    document.querySelector(`#${cardId}Market`).textContent = `Market: ${productData.market || 'All India'}`;
}

function analyzeAndDisplay(product1Data, product2Data) {
    if (!product1Data || !product1Data.success || !product2Data || !product2Data.success) {
        comparisonMessage.textContent = 'Could not fetch data for one or both products. Please try again.';
        comparisonMessage.className = 'api-log error';
        return;
    }

    displayProductCard('product1', product1Data);
    displayProductCard('product2', product2Data);

    const price1 = parseFloat(product1Data.price) || 0;
    const price2 = parseFloat(product2Data.price) || 0;
    const name1 = product1Data.name || 'Product 1';
    const name2 = product2Data.name || 'Product 2';

    let analysisText = '';
    let recommendationText = '';

    if (price1 > price2) {
        const difference = ((price1 - price2) / price2 * 100).toFixed(2);
        analysisText = `${name1} is ${difference}% more expensive than ${name2}.`;
        recommendationText = `💡 Consider selling ${name2} for better market value, or wait for ${name1} prices to stabilize.`;
    } else if (price2 > price1) {
        const difference = ((price2 - price1) / price1 * 100).toFixed(2);
        analysisText = `${name2} is ${difference}% more expensive than ${name1}.`;
        recommendationText = `💡 Consider selling ${name1} for better market value, or wait for ${name2} prices to stabilize.`;
    } else {
        analysisText = `Both ${name1} and ${name2} have similar pricing.`;
        recommendationText = '💡 Market rates are stable. Choose based on demand and soil conditions.';
    }

    document.querySelector('#priceAnalysis').textContent = analysisText;
    document.querySelector('#recommendation').textContent = recommendationText;

    comparisonResult.classList.remove('hidden');
    comparisonMessage.textContent = 'Comparison complete!';
    comparisonMessage.className = 'api-log success';
}

compareBtn.addEventListener('click', async () => {
    const product1 = product1Input.value.trim();
    const product2 = product2Input.value.trim();

    if (!product1 || !product2) {
        comparisonMessage.textContent = 'Please enter both products to compare.';
        comparisonMessage.className = 'api-log warning';
        return;
    }

    if (product1.toLowerCase() === product2.toLowerCase()) {
        comparisonMessage.textContent = 'Please enter different products to compare.';
        comparisonMessage.className = 'api-log warning';
        return;
    }

    comparisonMessage.textContent = 'Fetching product data...';
    comparisonMessage.className = 'api-log info';
    comparisonResult.classList.add('hidden');

    const [product1Data, product2Data] = await Promise.all([
        fetchProductData(product1),
        fetchProductData(product2)
    ]);

    analyzeAndDisplay(product1Data, product2Data);
});

// Allow Enter key to trigger comparison
product2Input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        compareBtn.click();
    }
});
