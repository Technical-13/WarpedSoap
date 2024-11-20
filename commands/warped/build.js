const client = require( '../..' );
const chalk = require( 'chalk' );
const axios = require( 'axios' );
const cheerio = require( 'cheerio' );
const ProductDB = require( '../../models/Products.js' );
const botVerbosity = client.verbosity;
const strScript = chalk.hex( '#FFA500' ).bold( './commands/warped/build.js' );

const startPage = 'https://warpedsoap.com/';
const basePageRegExp = new RegExp( /https?:\/\/warpedsoap.com\//, 'i' );
const allPages = { waiting: [ startPage ], processed: [] };
const getPages = ( thisPage ) => {
  axios( thisPage ).then( response => {
    const $ = cheerio.load( response.data );
    let newPages = Array.from( $( 'a' ) ).map( l => l.href.split( '#' )[ 0 ] );
    newPages = newPages.filter( p => p != thisPage );
    newPages = newPages.filter( ( val, i, arr ) => i == arr.indexOf( val ) ).filter( l => basePageRegExp.test( l ) ).sort();
    allPages.waiting = [].concat( allPages.waiting, newPages );
  } )
  .catch( errGetPage => {
    switch ( errGetPage.status ) {
      case 404:
        console.error( 'page %s not found!', thisPage );
      default:
        console.error( '%s error attempting to get page for - %s - :\n%o', errGetPage.status, thisPage, errGetPage.stack );
    }
  } );
}
const getPageData = async ( doPage ) => {
  window.location.href = doPage;
  await getPages( location.href );
  new Promise( async ( resolve, reject ) => {
    try {
      let dataset = document.getElementsByTagName( 'form' )[ 0 ].dataset;
      let firstImg = document.getElementsByClassName( 'flex-control-thumbs' )[ 0 ].firstChild.firstChild.src.split( '?' )[ 0 ];
      let hasVariations = ( dataset.product_variations ? true : false );
      let prodBlurb = document.getElementsByClassName( 'wp-block-post-excerpt__excerpt' )[ 0 ].textContent.trim();
      let prodCats = Array.from( document.getElementsByClassName( 'taxonomy-product_cat' )[ 0 ].children ).filter( c => c.tagName === 'A' ).map( a => a.textContent );
      let prodIsSub = ( prodCats.indexOf( 'Subscriptions' ) != -1 ? true : false );
      let prodDesc = Array.from( Array.from( document.getElementById( 'tab-description' ).querySelectorAll( 'p' ) ).map( p => p.textContent.trim() ) ).join( '\n' );
      let prodId = dataset.product_id;
      let prodInStock = ( document.getElementsByClassName( 'in-stock' ).length ? true : ( prodIsSub || false ) );
      let prodPrice = parseFloat( document.getElementsByTagName( 'bdi' )[ 0 ].childNodes[ 1 ].textContent );
      let prodName = document.querySelector( '[aria-label="Breadcrumb"]' ).lastChild.textContent.split( '/' ).pop().trim();
      let rating = document.querySelector( 'strong.rating' )?.textContent;
      let reviews =  document.querySelector( 'strong.rating' )?.nextElementSibling.textContent;
      let prodVars = [];
      if ( hasVariations && prodIsSub ) { prodVars = JSON.parse( dataset.product_variations ).map( v => v.attributes[ 'attribute_how-often' ] ); }
      else if ( hasVariations ) { prodVars = JSON.parse( dataset.product_variations ).map( v => v.attributes.attribute_scent ); }
      let relatedBox = document.querySelector( 'div[data-block-name="woocommerce/related-products"]' ).firstElementChild;
      let relatedItems = [];
      if ( relatedBox ) {
        relatedItems = Array.from( relatedBox.children[ 1 ].children ).map( ( rp, i ) => {
          let imgSrc = rp.children[ 0 ].firstElementChild.firstElementChild.src.split( '?' )[ 0 ];
          let itemName = rp.children[ 1 ].textContent.trim();
          let itemPrice = rp.children[ 2 ].innerText;
          let prodId = Array.from( relatedBox.children[ 1 ].children ).map( rp => {
            return ( rp.children[ 3 ].dataset.wcContext ? JSON.parse( rp.children[ 3 ].dataset.wcContext ).productId : rp.children[ 3 ].dataset.wcContext );
          } )[ i ];
          return {
            prodId: prodId,
            image: imgSrc,
            name: itemName,
            price: ( isNaN( parseFloat( itemPrice ) ) ? itemPrice : parseFloat( itemPrice ) )
          };
        } );
      }
      let data = {
        prodId: prodId,
        blurb: prodBlurb,
        categories: prodCats,
        description: prodDesc,
        image: firstImg,
        inStock: prodInStock,
        isSub: prodIsSub,
        name: prodName,
        price: prodPrice,
        rating: ( isNaN( parseFloat( rating ) ) ? rating : parseFloat( rating ) ),
        reviews: ( isNaN( parseInt( reviews ) ) ? reviews : parseInt( reviews ) ),
        variations: prodVars,
        related: relatedItems
      };
      resolve( data );
    }
    catch ( errGetPage ) { reject( errGetPage ); }
  } )
  .then( gotPage => {
    allPages.waiting = allPages.waiting.splice( location.href, 1 );
    allPages.processed.push( location.href );
    console.log( 'gotPage: %o', gotPage );
    //ProductDB.findOneAndUpdate( { name: gotPage.name }, gotPage, { upsert: true } )//Add entry to database
  } )
  .catch( errPage => { console.error( 'Failed to get page %s: %o', location.href, errPage ); } );
};

module.exports = {
	name: 'build',
  group: 'warped',
	description: 'Build the product database through web scrapping.',
	cooldown: 1000,
  ownerOnly: true,
  modOnly: false,
	run: async ( client, message, args ) => {
    await getPageData( startPage );
  }
};