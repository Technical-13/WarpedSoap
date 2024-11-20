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
/* TRON */console.log( 'getPages response.data: %s', response.data );/* TROFF */
/* TRON */console.log( 'All anchor tags: %o', $( 'a' ) );/* TROFF */
/* TRON */console.log( 'Array.from: %o', Array.from( $( 'a' ) ) );/* TROFF */
    let newPages = Array.from( $( 'a' ) ).map( l => l.href.split( '#' )[ 0 ] );
    newPages = newPages.filter( p => p != thisPage );
    newPages = newPages.filter( ( val, i, arr ) => i == arr.indexOf( val ) ).filter( l => basePageRegExp.test( l ) ).sort();
/* TRON */console.log( 'Adding newPages: %o', newPages );/* TROFF */
    allPages.waiting = [].concat( allPages.waiting, newPages );
  } )
  .catch( errGetPage => {
    switch ( errGetPage.status ) {
      case 404:
        console.error( 'page %s not found!', thisPage );
      default:
        console.error( '%s error attempting to get page for - %s - :\n%s', errGetPage.status, thisPage, errGetPage.stack );
    }
  } );
}
const getPageData = async ( doPage ) => {
  await getPages( doPage );
  axios( doPage ).then( response => {
    const $ = cheerio.load( response.data );/* TRON */console.log( 'getPageData response.data: %o', response.data );/* TROFF */
    let dataset = $( 'form' )[ 0 ].dataset;
    let firstImg = $( 'flex-control-thumbs' )[ 0 ].firstChild.firstChild.src.split( '?' )[ 0 ];
    let hasVariations = ( dataset.product_variations ? true : false );
    let prodBlurb = $( 'wp-block-post-excerpt__excerpt' )[ 0 ].textContent.trim();
    let prodCats = Array.from( $( 'taxonomy-product_cat' )[ 0 ].children ).filter( c => c.tagName === 'A' ).map( a => a.textContent );
    let prodIsSub = ( prodCats.indexOf( 'Subscriptions' ) != -1 ? true : false );
    let prodDesc = Array.from( Array.from( $( 'tab-description' ).querySelectorAll( 'p' ) ).map( p => p.textContent.trim() ) ).join( '\n' );
    let prodId = dataset.product_id;
    let prodInStock = ( $( 'in-stock' ).length ? true : ( prodIsSub || false ) );
    let prodPrice = parseFloat( $( 'bdi' )[ 0 ].childNodes[ 1 ].textContent );
    let prodName = $( '[aria-label="Breadcrumb"]' ).lastChild.textContent.split( '/' ).pop().trim();
    let rating = $( 'strong.rating' )?.textContent;
    let reviews =  $( 'strong.rating' )?.nextElementSibling.textContent;
    let prodVars = [];
    if ( hasVariations && prodIsSub ) { prodVars = JSON.parse( dataset.product_variations ).map( v => v.attributes[ 'attribute_how-often' ] ); }
    else if ( hasVariations ) { prodVars = JSON.parse( dataset.product_variations ).map( v => v.attributes.attribute_scent ); }
    let relatedBox = $( 'div[data-block-name="woocommerce/related-products"]' ).firstElementChild;
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
    return data;
  } )
  .then( gotPage => {
    allPages.waiting = allPages.waiting.splice( doPage, 1 );
    allPages.processed.push( doPage );
    /* TRON */console.log( 'gotPage: %o', gotPage );/* TROFF */
    //ProductDB.findOneAndUpdate( { name: gotPage.name }, gotPage, { upsert: true } )//Add entry to database
  } )
  .catch( errGetPage => {
    switch ( errGetPage.status ) {
      case 404:
        console.error( 'Page -%s- not found!', thisPage );
      default:
        console.error( '%s error attempting to get page -%s- :\n%s', errGetPage.status, doPage, errGetPage.stack );
    }
  } );
};

module.exports = {
	name: 'build',
  group: 'warped',
	description: 'Build the product database through web scrapping.',
	cooldown: 1000,
  ownerOnly: true,
  modOnly: false,
	run: async ( client, message, args ) => {
/* TRON */console.log( 'Getting startPage: %o', startPage );/* TROFF */
    await getPages( startPage );
  }
};