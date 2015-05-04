var fs = require("fs");
var path = require("path");

var gm = require("gm");
var async = require("async");
var mongoose = require("mongoose");
var ArgumentParser = require("argparse").ArgumentParser;

// Load in ENV variables
require("dotenv").load();

mongoose.connect(process.env.MONGO_URL);

// Load models
var modelsDir = path.resolve(__dirname, "../server/app/models");

fs.readdirSync(modelsDir).forEach(function (file) {
    if (~file.indexOf(".js")) {
        require(modelsDir + "/" + file);
    }
});

var Job = mongoose.model("Job");
var Result = mongoose.model("Result");
var Task = mongoose.model("Task");
var User = mongoose.model("User");

// ARG PARSER
var parser = new ArgumentParser({
    version: "0.0.1",
    addHelp: true
});

parser.addArgument(["--full"], {
    help: "A directory of full-size images to use as source material.",
    dest: "fullSizeDir"
});

parser.addArgument(["outputDir"], {
    help: "The directory to which the new images will be written."
});

parser.addArgument(["imagesDir"], {
    help: "The directory holding the images that'll be used as a data source."
});

parser.addArgument(["jobName"], {
    help: "The name of the job from which to pull the images."
});

var args = parser.parseArgs();

var imagesDir = path.resolve(args.imagesDir);
var outputDir = path.resolve(args.outputDir);

Task.find({
    job: args.jobName,
    // Equivalent to $size > 0
    "results.0": {$exists: true}
})
.populate("results")
.stream()
.on("data", function(task) {
    this.pause();

    var result = task.results[0];

    if (result.results.length === 0) {
        this.resume();
        return;
    }

    var fileName = task.files[0].name;
    var img = gm(path.resolve(imagesDir, fileName));
    var pos = 0;

    async.eachSeries(result.results, function(area, callback) {
        pos += 1;
        var cropped = img.crop(area.width, area.height, area.x, area.y);
        var outFileName = path.basename(fileName, ".jpg") + ".crop." + pos + ".jpg";
        var outputFile = path.resolve(outputDir, outFileName);

        cropped.write(outputFile, function(err) {
            if (err) {
                console.error(err);
            }
            console.log("Cropped", outFileName);
            callback();
        });
    }, function() {
        console.log("Finished:", fileName);
        this.resume();
    }.bind(this))
})
.on("error", function() {
    
})
.on("close", function() {
    console.log("DONE");
    process.exit(0);
});

/*
async.eachSeries(images, function(image, callback) {
    var selectionId = image.selections[0].$oid

    for (var i = 0; i < selections.length; i++) {
        if (selections[i]._id.$oid == selectionId) {
            image.matchedSelection = selections[i].selections[0];
            break;
        }
    }

    if (!image.matchedSelection) {
        console.error("No selection found.", selectionId);
        return callback();
    }

    var gm_img = gm(path.resolve(imagesDir, image.scaled.file));

    gm_img.size(function(err, theSizeObj) {
        var ratio = theSizeObj.width / image.scaled.width;
        var x = image.matchedSelection.x * ratio;
        var y = image.matchedSelection.y * ratio;
        var width = image.matchedSelection.width * ratio;
        var height = image.matchedSelection.height * ratio;

        async.series([
            function(callback) {
                var cropped_img_path = path.resolve(croppedDir,
                    image.scaled.file);

                fs.exists(cropped_img_path, function(exists) {
                    if (exists) {
                        return callback();
                    }

                    var cropped_img = gm_img.crop(width, height, x, y);
                    cropped_img.write(cropped_img_path, function() {
                        console.log("Successfully cropped",
                            cropped_img_path);
                        callback();
                    });
                });
            },
            function(callback) {
                var scaled_img_path = path.resolve(scaledDir,
                    image.scaled.file);

                fs.exists(scaled_img_path, function(exists) {
                    if (exists) {
                        return callback();
                    }

                    var scaled = ukiyoe.images.parseSize(
                        process.env.SCALED_SIZE);
                    var scaled_img = gm_img.crop(width, height, x, y)
                        .resize(scaled.width, scaled.height, "^>");

                    scaled_img.write(scaled_img_path, function() {
                        console.log("Successfully scaled", scaled_img_path);
                        callback();
                    });
                });
            },
            function(callback) {
                var thumbs_img_path = path.resolve(thumbsDir,
                    image.scaled.file);

                fs.exists(thumbs_img_path, function(exists) {
                    if (exists) {
                        return callback();
                    }

                    var thumb = ukiyoe.images.parseSize(
                        process.env.THUMB_SIZE);
                    var thumb_img = gm_img.crop(width, height, x, y)
                        .resize(thumb.width, thumb.height, ">")
                        .gravity("Center")
                        .extent(thumb.width, thumb.height);

                    thumb_img.write(thumbs_img_path, function() {
                        console.log("Successfully thumbs",
                            thumbs_img_path);
                        callback();
                    });
                });
            }
        ], callback);
    });
});
*/