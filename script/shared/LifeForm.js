import DB from "./DB";
import World from "./World";
import Hive from "./Hive";
import Tile from "./Tile";
import Biome from "./Biome";
import Utils from "./Utils";
import Item from "./Item";
import AStar from "./utils/AStar";
import AStarNode from "./utils/AStarNode";

export default class LifeForm {
    constructor()
    {
        this._id = null;
        this.x = Math.floor(Biome.size/2);
        this.y = Math.floor(Biome.size/2);
        this.pixelX = this.x*Tile.SIZE;
        this.pixelY = this.y*Tile.SIZE;
        this.health = 100;
        this.hunger = 100;
        this.action = LifeForm.ACTION_IDLE;
        this.sightDistance = 100;
        this.destination = undefined;
        this.path = [];
        this.speed = 4; // How many pixels per second
        this.tickOverflow = 0;
        console.log('lifeform?');

    }

    animate()
    {
        this.tickOverflow++;
        if (this.destination !== undefined && this.destination !== null && this.path.length > 0 && this.tickOverflow >= 60/this.speed) {
            console.log('destination: ',this.destination);
            console.log('go to dest: ',this.pixelX,this.pixelY, '|',this.destination.x*Tile.SIZE,this.destination.y*Tile.SIZE);
            if (this.path[0].x > this.x) {
                // console.log('+x');
                this.pixelX ++;
            }
            if (this.path[0].x < this.x) {
                // console.log('-x');
                this.pixelX --;
            }
            if (this.path[0].y > this.y) {
                // console.log('+y');
                this.pixelY ++;
            }
            if (this.path[0].y < this.y) {
                // console.log('-y');
                this.pixelY --;
            }
            if (
                this.pixelX === this.path[0].x*Tile.SIZE &&
                this.pixelY === this.path[0].y*Tile.SIZE
            ) {
                console.log('WE MADE IT');
                this.x = this.path[0].x;
                this.y = this.path[0].y;
                this.path.splice(0,1);
                this.save();
                this.checkLocalArea();
            }
            this.tickOverflow = 0;
        }
    }

    static spawn()
    {
        console.log('spawning!');
        var lifeForm;
        lifeForm = new LifeForm();
        lifeForm._id = Hive.lifeForms.length;
        // Swarm.upgrade(lifeForm);
        lifeForm.notifySwarm();
        return lifeForm;
    }

    setTask(){}
    startTask(){}
    notifySwarm(){console.log('no swarm here');}


    static swarmify(lifeform)
    {
        lifeform.save = function()
        {
            DB.update(DB.COLLECTION_LIFE,{_id:this._id},this);
        };

        lifeform.setTask = function(action){
            console.log('swarm set task!');
            this.action = action;
        };
        lifeform.notifySwarm = function(){console.log('oh hai! swarm here');}


        lifeform.startTask = function()
        {
            console.log('lifeform start action');
            if (this.action === LifeForm.ACTION_GATHER_FOOD) {
                // if can see food
                if (!this.checkLocalArea(LifeForm.ACTION_GATHER_FOOD)) {

                // else if any known food
                    var i, dist = null, result = null;
                    for (i = 0; i < Hive.known.items.length; i++) {
                        if (Hive.known.items[i].type === Item.TYPE_APPLE) {
                            var tileDist = Utils.dist(this.x,this.y,Hive.known.items[i].x,Hive.known.items[i].y);
                            if (dist === null || dist > tileDist) {
                                dist = tileDist;
                                result = Hive.known.items[i];
                            }
                        }
                    }
                    // There's some known about food, let's just go there
                    if (result !== null) {
                        console.log('setting the dest #1',result);
                        this.destination = result;
                    } else {
                        // There's no known food, let's explore!
                        var closest = null, dist = null;
                        console.log('checjing edge tiles:',World.edgeTiles);
                        console.log(World.renderTilesVisible());
                        if (World.edgeTiles.length === 0) {
                            // Let's get the edge tiles!
                            World.populateEdges();
                        }
                        for (i=0; i < World.edgeTiles.length; i++) {
                            var tileDist = Utils.dist(this.x,this.y,World.edgeTiles[i].x,World.edgeTiles[i].y);
                            if (dist === null || dist > tileDist) {
                                dist = tileDist;
                                closest = World.edgeTiles[i];
                            }
                        }
                        console.log('setting the dest #2',closest,World.edgeTiles);
                        this.destination = closest;
                    }
                }
                if (this.destination !== null) {
                    console.log('got a destination, start pathfinding', this.destination);
                    console.log('current location', World.tiles[this.y][this.x]);


                    //var astar = new AStar(World.tiles[0].length,World.tiles.length);
                    var x,y, grid = [];
                    for (y = 0; y < World.tiles.length;y++) {
                        grid[y] = [];
                        for (x = 0; x < World.tiles[y].length;x++) {
                            grid[y][x] = new AStarNode(x,y);
                            if (World.tiles[y][x].blocked === true) {
                                grid[y][x].blocked = true;
                            }
                        }
                    }

                    for (y = 0; y < grid.length;y++) {
                        var output = '';
                        for (x = 0; x < grid[y].length; x++) {
                            if (grid[y][x].blocked) {
                                output += '1,';
                            } else {
                                output += '0,';
                            }
                        }
                        console.log('block test:',output);
                    }

                    for (y = 0; y < World.tiles.length;y++) {
                        var output = '';
                        for (x = 0; x < World.tiles[y].length;x++) {
                            /*
                            if (World.tiles[y][x].isEdge()) {
                                output += '1,';
                            } else {
                                output += '0,';
                            }
                            */
                            var z
                            var gotOne = false;
                            for (z =0; z < World.edgeTiles.length; z++) {
                                if (World.edgeTiles[z] === World.tiles[y][x]) {
                                    gotOne = true;
                                    break;
                                }
                            }

                            if (gotOne) {
                                output += '1,';
                            } else {
                                output += '0,';
                            }


                        }
                        console.log(output);
                    }
                    console.log('lets astar.search this!');


                    var startNode = grid[this.y][this.x];
                    var endNode = grid[this.destination.y][this.destination.x];

                    var astar = new AStar(grid);
                    var path = astar.search(startNode,endNode);
                    if (path.length) {
                        this.path = path;
                        // console.log(path);
                        this.save();
                    }


                    // console.log(astar.);

                    /*
                    for (var a = 0; a < astar.grid.length; a++) {
                        var output = '';
                        for (var b = 0; b < astar.grid[a].length; b++) {
                            if (astar.grid[a][b].isWall) {
                                output += '1';
                            } else {
                                output += '0';
                            }
                        }
                        console.log('row: ',output);
                    }
                    */
                    //var test = astar.search(this.x,this.y,this.destination.x,this.destination.y);
                    // console.log(test);
                }

                console.log('got dest',this.destination);
            }
        }

        lifeform.checkLocalArea = function(itemType = 0)
        {
            console.log('checking the local area');
            // console.log(World.tiles);
            var x,y;
            var maxTileDist = Math.ceil(this.sightDistance/Tile.SIZE);
            // console.log('y',this.y-maxTileDist,'->',this.y+maxTileDist);
            // console.log('x',this.x-maxTileDist,'->',this.x+maxTileDist);
            var dist = null;
            var result = null;
            for (y = this.y-maxTileDist; y < this.y+maxTileDist; y++) {
                for (x = this.x-maxTileDist; x < this.x+maxTileDist; x++) {
                    // console.log('testing tile',x,y);
                    if (World.tiles[y] !== undefined && World.tiles[y][x] !== undefined) {
                        // console.log('tiles is defined');

                        // The tile isn't visible, let's make it visible
                        if (!World.tiles[y][x].visible) {
                            World.tiles[y][x].visible = true;
                            // remove the tile from the unexplored array
                            var i;
                            for (i=0; i < World.unexploredTiles.length; i++) {
                                if (World.unexploredTiles[i] === World.tiles[y][x]) {
                                    World.unexploredTiles.splice(i,1);
                                    if (World.tiles[y][x].isEdge()) {
                                        World.edgeTiles.push(World.tiles[y][x]);
                                    }
                                    break;
                                }
                            }
                            /*
                            for (i=0; i < World.edgeTiles.length; i++) {
                                if (World.edgeTiles[i] === World.tiles[y][x] && !World.tiles[y][x].isEdge()) {
                                    World.edgeTiles.splice(i,1);
                                    break;
                                }
                            }
                            */
                            World.tiles[y][x].update();
                        }
                        // console.log('tile type:', World.tiles[y][x].type, 'inventory: ',World.tiles[y][x].inventory);

                        // We're looking for something! Let's sort it out here
                        if (itemType !== 0) {
                            if (
                                World.tiles[y][x].type === Tile.TYPE_APPLE_TREE &&
                                World.tiles[y][x].inventory.length > 0
                            ) {
                                // console.log('we found an apple tree!!!');
                                var tileDist = Utils.dist(this.x, this.y, World.tiles[y][x].x, World.tiles[y][x].y);
                                if (dist === null || dist > tileDist) {
                                    dist = tileDist;
                                    result = World.tiles[y][x];
                                }
                            }
                        }
                        // console.log('checking tile',World.tiles[y][x]);
                    } else {
                        console.log('tile is undefined?');
                    }
                }
            }
            World.checkEdges();
            if (result !== null) {
                console.log('setting the dest #3',result);
                this.destination = result;
                return true;
            } else {
                console.log('there were no apples in sight');
            }
            return false;
        }


    }
}
LifeForm.ACTION_IDLE = 0;
LifeForm.ACTION_GATHER_FOOD = 1;