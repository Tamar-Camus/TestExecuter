//var jenkinsLoad = window.onload;
//window.onload = function() {
//	window.onload = jenkinsLoad;
//	jenkinsLoad();
//	reloadTree();
//};

NAMES = {
	TREE_CONTAINER_NAME: "testsTreeContainer",
	SELECTED_NAME: "selectedTestsTextBox",
	PATH_NAME: "propertiesFilePath",
	LOAD_BTN: "loadTreeButton"
}

var lastLoadedFile = null;

function getPropertiresFilePath() {
	var pathTextBox = document.getElementById(NAMES.PATH_NAME);
	if(pathTextBox == null || pathTextBox.value.length == 0) {
		console.log("BUG: Empty properties file path");
		return null;
	}
	
	return pathTextBox.value;
}

function reloadTree() {
	var filePath = getPropertiresFilePath();
	if(filePath == null ) {
		return;
	}
	
	var testsTreeContainer = document.getElementById(NAMES.TREE_CONTAINER_NAME);
	testsTreeContainer.innerHTML = "Loading properties...";
	
	TestExecuterRPC.getLoadPropertiesFile(filePath, function(t) {
		 loadTreeFromProperties(filePath, t.responseObject());
	});
}

function loadTreeFromFile(filePath) {
	if(filePath == null ) {
		return;
	}
	
	var testsTreeContainer = document.getElementById(NAMES.TREE_CONTAINER_NAME);
	testsTreeContainer.innerHTML = "Loading properties...";
	
	TestExecuterRPC.getLoadPropertiesFile(filePath, function(t) {
		 loadTreeFromProperties(filePath, t.responseObject());
	});
}

function onEditFilePath() {
	var loadBtn = document.getElementById(NAMES.LOAD_BTN);
	
	var filePath = getPropertiresFilePath();
	if(filePath == lastLoadedFile) {
		loadBtn.value = "Reload File";
	} else {
		loadBtn.value = "Load File";
	}
}

function loadTreeFromProperties(propertiesFilePath, propertiesFileContent) {
	var testsTreeContainer = document.getElementById(NAMES.TREE_CONTAINER_NAME);
	
	if(propertiesFileContent == null) {
		testsTreeContainer.innerHTML = "File not exist or could not open file";
		return;
	}
	
	if(propertiesFileContent.length == 0) {
		testsTreeContainer.innerHTML = "File is empty";
		return;
	}
	
	lastLoadedFile = propertiesFilePath;
	testsTreeContainer.innerHTML = "";
	
	var properties = readPropertiesData(propertiesFileContent);
	
	properties.testsTreeContainer = testsTreeContainer;
	properties.selectedTestsTextBox = document.getElementById(NAMES.SELECTED_NAME);
	if(propertiesFilePath != lastLoadedFile) {
		properties.selectedTestsTextBox.value = "";
	}
	properties.selectedTests = getSelectedTests(properties.selectedTestsTextBox);
	
	properties.isTestSelected = function(test) {
		return searchTestByKey(this.selectedTests, test) >= 0;
	};
	
	properties.addSelectedTest = function(test) {
		var testKey = createKeyFromTest(test,this);
		this.selectedTests.push(testKey);
		this.commitSelected();
	};
	
	properties.removeSelectedTest = function(test) {
		var i = searchTestByKey(this.selectedTests, test);
		
		if(i == -1) {
			return;
		}
		
		this.selectedTests.splice(i, 1);
		
		this.commitSelected();
	};
	
	properties.commitSelected = function() {
		var result = ""
		for(var i=0; i < this.selectedTests.length; ++i) {
			if(i > 0) {
				result += ","; 
			}
			
			result += JSON.stringify(this.selectedTests[i]);
		}
		
		result = "[" + result + "]";
		this.selectedTestsTextBox.value = result;
		console.log(result);
	}
	
	loadTree(properties);
	onEditFilePath();
}

function commaSeperatedToArray(str) {
	var result = str.split(",");
	for(var i=0; i < result.length; ++i) {
		result[i] = result[i].trim();
	}
	return result;
}

function readPropertiesData(propertiesData) {
	var properties = parseData(propertiesData);
	
	// These are the fields in properties:
	// testsArray, enableField, groupBy, keyFields, fieldSeparator, showFields
	properties.tests = JSON.parse(properties.tests);
	properties.keyFields = commaSeperatedToArray(properties.keyFields);
	properties.showFields = commaSeperatedToArray(properties.showFields);
	properties.enableField = properties.enableField.trim();
	properties.groupBy = properties.groupBy.trim();
	properties.fieldSeparator = properties.fieldSeparator.trim();
	
	properties.tests = properties.tests.sort(getTestComperator(properties.showFields));
	
	properties.groupsMap = getGroups(properties);
	properties.groups = getSortedGroups(properties.groupsMap);
	
	return properties;
}

function getSortedGroups(groupsMap) {
	var groups = [];
	
	for(var key in groupsMap) {
		groups.push(key);
	}
	
	groups.sort(function (a,b) {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});
	
	return groups;
}

function getGroups(properties) {
	var result = {};
	var tests = properties.tests;
	
	for (var i = 0; i < tests.length; ++i) {
		var test = tests[i];
		var enabledField = test[properties.enableField];
		
		var enabled = true;
		if(enabledField) {
			enabled = Boolean(test[properties.enableField]);
		}

		if (!enabled) {
			continue;
		}

		var key = test[properties.groupBy];
		if(!key) {
			key = "UNGROUPED";
		}
		
		if(!result[key]) {
			result[key] = [];
		}
		
		result[key].push(test);
	}
	
	return result;
}

/**
 * Renders the tree
 * @param properties
 * @param testsTreeContainer
 */
function loadTree(properties) {
	// These are the fields in properties:
	// testsArray, enableField, groupBy, keyFields,fieldSeparator, showFields
	
	var titleDiv = document.createElement('div');
	titleDiv.className = "treeTitle";
	titleDiv.innerHTML = "Choose tests:";
	properties.testsTreeContainer.appendChild(titleDiv);
	
	for(var i=0; i < properties.groups.length; ++i) {
		var groupName = properties.groups[i];
		var groupTests = properties.groupsMap[groupName];
		
		createGroup(groupName, groupTests, properties);
	}
}

function createGroup(groupName, groupTests, properties) {
	var groupDiv = document.createElement('div');
	groupDiv.className = "group";
	
	var plusButton = document.createElement('span');
	plusButton.className = "tree-button button-expand";
	plusButton.checked = false;
	plusButton.onclick = function() {
		showHideGroup(groupDiv, plusButton);
	};
	
	var groupCheck = document.createElement('input');
	groupCheck.type = "checkbox";
	groupCheck.onclick = function() {
		setGroup(groupDiv, groupCheck);
	};
	
	var groupTitle = document.createElement('span');
	groupTitle.innerHTML = groupName;
	
	var groupTitleDiv = document.createElement('div');
	groupTitleDiv.appendChild(plusButton);
	groupTitleDiv.appendChild(groupCheck);
	groupTitleDiv.appendChild(groupTitle);
	groupTitleDiv.className = "groupTitle";
	properties.testsTreeContainer.appendChild(groupTitleDiv);

	var groupState = {
		selectedCounter: 0,
		size: groupTests.length,
		inc: function() {
			++this.selectedCounter;
			this.refreshState();
		},
		dec: function() {
			--this.selectedCounter;
			this.refreshState();
		},
		refreshState: function() {
			groupCheck.checked = this.selectedCounter == this.size;
		}
	};
	
	for(var j=0; j < groupTests.length; ++j) {
		createTest(groupDiv, groupTests[j], groupState, properties);
	}
	
	if(groupState.selectedCounter > 0) {
		showHideGroup(groupDiv, plusButton);
	}
	
	properties.testsTreeContainer.appendChild(groupDiv);
}

function createTest(groupContainer, test, groupState, properties) {
	var testCheck = document.createElement('input');
	testCheck.type = "checkbox";
	testCheck.checked = properties.isTestSelected(test); 
	
	testCheck.onclick = function() {
		if(testCheck.checked) {
			groupState.inc();
		} else {
			groupState.dec();
		}
		
		selectTest(test, testCheck.checked, properties);
	};
	
	if(testCheck.checked) {
		groupState.inc();
	}
	
	var testTitle = document.createElement('span');
	testTitle.innerHTML = getShowString(test, properties);
	
	var testDiv = document.createElement('div');
	testDiv.appendChild(testCheck);
	testDiv.appendChild(testTitle);
	groupContainer.appendChild(testDiv);
}

function createKeyFromTest(test, properties) {
	var result = {};
	
	var keyFields = properties.keyFields;
	
	for(var i=0; i < keyFields.length; ++i) {
		var field = keyFields[i];
		result[field] = test[field];
	}
	
	return result;
}

function isTestEqualsKey(keys, test) {
	for(var k in keys) {
		if(test[k] != keys[k]) {
			return false;
		}
	}
	
	return true;
}

function searchTestByKey(selecteTests, test) {
	for(var i=0; i < selecteTests.length; ++i) {
		if(isTestEqualsKey(selecteTests[i],test)) {
			return i;
		}
	}
	
	return -1;
}

function getSelectedTests(selectedTestsTextBox) {
	var selectedTests = [];
	
	try {
		selectedTests = JSON.parse(selectedTestsTextBox.value);
	} catch(err) {
		console.log(err);
		console.log(selectedTestsTextBox.value);
		selectedTests = [];
		selectedTestsTextBox.value = "[]";
	}
	
	if(!selectedTests) {
		console.log("selectedTests is null");
		console.log(selectedTests);
		selectedTests = [];
		selectedTestsTextBox.value = "[]";
	}
	
	return selectedTests;
}

function selectTest(test, select, properties) {
	if(select) {
		properties.addSelectedTest(test);
	} else {
		properties.removeSelectedTest(test);
	}
}

function getShowString(test, properties) {
	var result = "";
	
	var showFields = properties.showFields;
	var fieldSeparator = properties.fieldSeparator;
	
	for (var i = 0; i < showFields.length; ++i) {
		var fieldValue = test[showFields[i]];
		if (fieldValue == null || fieldValue.length == 0) {
			fieldValue = "NULL";
		}

		if (i > 0) {
			result += fieldSeparator;
		}

		result += fieldValue;
	}
	
	return result;
}

function getTestComperator(fieldsToShow) {
	return function compareTest(test1, test2) {
		for (var i=0; i < fieldsToShow.length; ++i) {
			var fieldValue1 = test1[fieldsToShow[i]],
				fieldValue2 = test2[fieldsToShow[i]];
			
			if (fieldValue1 != null && fieldValue2 != null) {
				if (fieldValue1 == fieldValue2) {
					continue;
				} else {
					return fieldValue1.toLowerCase().localeCompare(fieldValue2.toLowerCase());
				}
			} else if (fieldValue1 == null && fieldValue2 == null) {
				continue;
			} else {
				if (fieldValue1 == null) {
					return 1;
				} else {
					return -1;
				}
			}
		}
	
		return 0;
	};
};

/** Parse .properties files */
function parseData(data) {
	var result = {};
	var parameters = data.split( /\n/ );
   
	for(var i=0; i<parameters.length; i++ ) {
		parameters[i] = parameters[i].replace( /^\s\s*/, '' ).replace( /\s\s*$/, '' ); // trim
       
		if(parameters[i].length > 0 && parameters[i].match("^#") != "#") { // skip comments
			var charIter = 0;
			while(charIter < parameters[i].length && parameters[i].charAt(charIter) != '=') {
				++charIter;
			}
			
			if(charIter == parameters[i].length) {
				continue;
			}
			
			var name = parameters[i].substring(0,charIter).trim();
			var value = parameters[i].substring(charIter+1).trim();
			result[name] = value;
       } 
   }
   
   return result;
}

function setGroup(groupDiv, checkElement) {
	var check = checkElement.checked;
	selectGroup(groupDiv, check);
}

function selectGroup(groupDiv, check) {
	var inputs = groupDiv.getElementsByTagName('input');

	var checkboxes = [];

	for(var i=0; i < inputs.length; ++i) {
		if(inputs[i].type.toLowerCase() == 'checkbox') {
		    checkboxes.push(inputs[i]);
		}
	}

	checkAll(inputs,check);
}

function checkAll(checkboxes, check) {
	for(var i=0; i < checkboxes.length; ++i) {
		if(checkboxes[i].checked != check) {
			checkboxes[i].checked = check;
			checkboxes[i].onclick();
		}
	}
}

function showHideGroup(groupDiv, button) {
	button.checked = !button.checked;
	
	groupDiv.style.display = button.checked ? 'block' : 'none';
	button.className = "tree-button " + 
		(button.checked ? "button-collapse" : "button-expand");
}
