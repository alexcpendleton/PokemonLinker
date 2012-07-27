// ==UserScript==
// @name       Pokemon Linker
// @namespace  http://www.pendletron.com
// @version    0.1
// @description  Creates links to the same pokemon on other sites (Smogon, Serebii, PokemonDB, Bulbapedia). Currently only works for B/W
// @match      http://*serebii.net/pokedex-bw/*
// @match      http://*smogon.com/bw/pokemon/*
// @match      http://*pokemondb.net/pokedex/*
// @match      http://bulbapedia.bulbagarden.net/wiki/*
// @copyright  2012+, Alex Pendleton
// ==/UserScript==
/*!
  * klass: a classical JS OOP façade
  * https://github.com/ded/klass
  * License MIT (c) Dustin Diaz & Jacob Thornton 2012
  */
!function(a,b){typeof define=="function"?define(b):typeof module!="undefined"?module.exports=b():this[a]=b()}("klass",function(){function f(a){return j.call(g(a)?a:function(){},a,1)}function g(a){return typeof a===c}function h(a,b,c){return function(){var d=this.supr;this.supr=c[e][a];var f=b.apply(this,arguments);return this.supr=d,f}}function i(a,b,c){for(var f in b)b.hasOwnProperty(f)&&(a[f]=g(b[f])&&g(c[e][f])&&d.test(b[f])?h(f,b[f],c):b[f])}function j(a,b){function c(){}function l(){this.initialize?this.initialize.apply(this,arguments):(b||h&&d.apply(this,arguments),j.apply(this,arguments))}c[e]=this[e];var d=this,f=new c,h=g(a),j=h?a:this,k=h?{}:a;return l.methods=function(a){return i(f,a,d),l[e]=f,this},l.methods.call(l,k).prototype.constructor=l,l.extend=arguments.callee,l[e].implement=l.statics=function(a,b){return a=typeof a=="string"?function(){var c={};return c[a]=b,c}():a,i(this,a,d),this},l}var a=this,b=a.klass,c="function",d=/xyz/.test(function(){xyz})?/\bsupr\b/:/.*/,e="prototype";return f.noConflict=function(){return a.klass=b,this},a.klass=f,f})

var PokeInfo = klass(function(dexID, name) {
	this.dexID = dexID;
	this.name = name;
})
.methods({
	clone: function() {
		return new PokeInfo(this.dexID, this.name);
	}
});

function zeroFill(number, width) {
  width -= number.toString().length;
  if (width > 0) {
    return new Array( width + (/\./.test( number ) ? 2 : 1) ).join( '0' ) + number;
  }
  return number + ""; // always return a string
}

var LinkerContext = klass({
	uri: "",
	getSingleNode: function() { return null; }	
});

var WindowContext = LinkerContext.extend({
	initialize: function() {
		this.window = unsafeWindow;
		this.document = this.window.document;
		this.uri = this.window.location.href;
	},
	evaluateXPath: function(xpath) {
		return this.document.evaluate(xpath, this.document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
	},
	getSingleNode: function(xpath) {
		var nodes = this.evaluateXPath(xpath);
		if(nodes.snapshotLength > 0) {
			return nodes.snapshotItem(0);
		}
		return null;
	}
});

var Linker = klass(function(uriPattern, context) {
	this.outputUriPattern = uriPattern;
	this.context = context;
})
.methods({
	deriveLink: function(pokeInfo) {
		var info = this.massageInfo(pokeInfo);
		return this.outputUriPattern.replace("%dexid%", info.dexID).replace("%name%", info.name);
	},
	massageInfo: function(pokeInfo) {		
		return pokeInfo.clone();
	},
	deriveInfo: function() {
		return new PokeInfo(undefined, undefined);
	},
	onThisSite: function() {
		return false;
	}
})
.statics({
	smogonStyleMassage: function(pokeInfo) {
		var results = pokeInfo.clone();
		// Remove any special characters, not hyphens
		// Farfetch'd = farfetchd; Ho-oh = ho-oh, Mime Jr. = mime_jr
		results.name = results.name.toLowerCase()
			.replace(/\u2640/, "-f") // female character (Nidoran)
			.replace(/\u2642/, "-m") // male character
			.replace(" ", "_") // spaces get converted to underscores
			.replace(/[^a-z0-9\-_]/i, "");		
		return results;
	}
});

var SerebiiLinker = Linker.extend({
	initialize: function(context) {
		this.outputUriPattern = "http://www.serebii.net/pokedex-bw/%dexid%.shtml";
		this.context = context;
	},
	deriveInfo: function() {
		var title = this.context.document.title;
		var results = new PokeInfo(0, null);
		var dexStartIndex = title.indexOf("#") + 1;
		var dexEndIndex = dexStartIndex + 3;
		results.dexID = title.slice(dexStartIndex, dexEndIndex);
		results.name = title.slice(dexEndIndex + 1);
		return results;
	},
	massageInfo: function(pokeInfo) {
		var results = pokeInfo.clone();
		results.dexID = zeroFill(results.dexID, 3);
		return results;
	},
	onThisSite: function() {
		return this.context.uri.indexOf("serebii.net") > -1;
	}	
});

var SmogonLinker = Linker.extend({
	initialize: function() {
		this.outputUriPattern = "http://www.smogon.com/bw/pokemon/%name%";
		this.context = context;
	},
	deriveInfo: function() {
		var href = this.uri;
		var results = new PokeInfo(0, null);
		var nameMatch = href.match("pokemon/(\\w*)");
		if (nameMatch && nameMatch.length > 1) {
			results.name = nameMatch[1];
		}
		var img = this.context.getSingleNode('//*[@id="dex_pokemon"]/tbody/tr/td[@class="sprite"]/img');
		if(img) {
			var src = img.src;
			var dexStartIndex = src.lastIndexOf("/") + 1;
			var dexEndIndex = src.lastIndexOf(".png");
			results.dexID = src.slice(dexStartIndex, dexEndIndex);
		}
		return results;
	},
	massageInfo: function(pokeInfo) {
		return Linker.smogonStyleMassage(pokeInfo);
	},
	onThisSite: function() {
		return this.context.uri.indexOf("smogon.com") > -1;
	}	
});

var PokemonDBNetLinker = Linker.extend({
	initialize: function() {
		this.outputUriPattern = "http://pokemondb.net/pokedex/%name%";
	},
	deriveInfo: function() {
		var href = this.context.uri;
		// Strip any trailing slashes
		if (href.lastIndexOf("/") === href.length - 1) {
			href = href.substring(0, href.length - 1);
		}
		var results = new PokeInfo(0, null);
		var nameStartIndex = href.lastIndexOf("/");		
		var e = this.context.getSingleNode('//*[@id="pk-content"]/div[1]/h1');
		if(e) {
			results.name = e.innerText;
		}		
		e = this.context.getSingleNode('//*[@id="pk-content"]/div[4]/div[2]/table/tbody/tr[1]/td/strong');
		if (e) {			
			results.dexID = e.innerText.replace(" ", "");
		}
		return results;
	},
	massageInfo: function(pokeInfo) {
		return Linker.smogonStyleMassage(pokeInfo);
	},
	onThisSite: function() {
		return this.context.uri.indexOf("pokemondb.net") > -1;
	}	
});

var BulbapediaLinker = Linker.extend({
	initialize: function() {
		this.outputUriPattern = "http://bulbapedia.bulbagarden.net/wiki/%name%";
		this.headingPokemonIdentifier = " (Pokémon)";
	},
	deriveInfo: function() {
		var heading = this.getPageHeadingText().replace(this.headingPokemonIdentifier, "");
		var results = new PokeInfo(0, heading);
		//var dexNode = this.context.getSingleNode('//*[@id="mw-content-text"]/table[3]/tbody/tr[1]/td/table/tbody/tr/td[3]/table/tbody/tr/td/big/big/span/b/a/span');
		var dexNode = this.context.getSingleNode('//*[@title="List of Pokémon by National Pokédex number"]/a');
		if(dexNode) {
			results.dexID = dexNode.innerText.replace("#", "");
		}
		return dexNode;
	},
	massageInfo: function(pokeInfo) {
		return Linker.smogonStyleMassage(pokeInfo);
	},
	onThisSite: function() {
		return ( (this.context.uri.indexOf("bulbapedia.bulbagarden.net") > -1)
				  && (this.pageIsForPokemon) );
		
	},
	getPageHeadingText: function() {
		var node = this.context.getSingleNode('//*[@id="firstHeading"]/span');
		return node.innerText;		
	},
	pageIsForPokemon: function() {
		var heading = this.getPageHeadingText();
		return heading.indexOf(this.headingPokemonIdentifier) > -1;
	}
});

var context = new WindowContext(unsafeWindow);
var linkers = [new SerebiiLinker(context), 
	new PokemonDBNetLinker(context), 
	new SmogonLinker(context), 
	new BulbapediaLinker(context)];
	
var allOtherLinks = [];
var currentLinker, currentLinkerIndex, currentPokeInfo;

for(var i = 0; i < linkers.length; i++) {
	if (linkers[i].onThisSite()) {
		currentLinker = linkers[i];
		currentLinkerIndex = i;
		currentPokeInfo = currentLinker.deriveInfo();
		break;
	}
}
for(var i = 0; i < linkers.length; i++) {
	if (i != currentLinkerIndex) {
		allOtherLinks.push(linkers[i].deriveLink(currentPokeInfo));
	}
}

console.log(allOtherLinks);
