The plugin consists of the following files:
==================================================================
* src/main/java/il/ac/technion/jenkins/plugins
	- TestExecuter.java: TestExecuter class
* /src/main/resources/il/ac/technion/jenkins/plugins/TestExecuter
	- config.jelly: UI for job configuration for TestExecuter class
	- index.jelly: UI for job build for TestExecuter class
	- help files for the configuration UI (html)
* /src/main/webapp/js
	- TestExecuter.js: Javascript function for the configuration and build UI

TestExecuter.java
==================================================================
Since our plugin is a build parameter our TestExecuter class extends "SimpleParameterDefinition" class.

Members:
-
* uuid - A random number which helps to give a unique id's to the objects used in the jelly files.
	We need it since we want to be able to add the plugin to the job as many times as we want.
	That way our objects are unique in each addition and we can defer them from one another.
	Furthermore, if the plugin are added more then once, the on build you will get more then one tree.
	That way we can also defer the trees from one another.
* propertiesFilePath - In this parameter we will save the properties file path the user entered.
* enableField - Name of the field that will imply if the test is enabled or not. 
* groupBy - Name of the field in which the plugin will group the tests by. 
* showFields - Name of the field(s) that will be shown in the tests tree. 
* multiplicityField - Name of the field, in which the plugin will save in the amount of times the test should run. 
* fieldSeparator - The character that will separate between the fields in the tests tree. 

Significant functions:
-
* getAsJson() - Returns a json object which consists of (field/content) pairs.
	Only for the following fields: enableField, groupBy, fieldSeparator, showFields, multiplicityField.
* loadPropertiesFile(String) - Calls similar function in the DescriptorImpl class.
	Will be explained later.

Nested classes:
-
* ReadFileResponse: This class is the return value of loadPropertiesFile().
	It consists of the members: success, errorMsg, content.
	It help us manage the success/failure of the properties file opening.
* DescriptorImpl: This class is used to describe the TestExecuter class.
	- loadPropertiesFile(String) - This function gets the file path and tries to open it.
			If it succeeds then it returns the content of the file.
			If it fails then it returns appropriate message with the reason of the failure and a null for the content.
			This function can be called by javascript code.

config.jelly
==================================================================
This file creates the plugin UI that appears in the job configuration.

It contains:
-
- Javascript object named "TestExecuterRPC" that will contain an object that will allow us to call RPC method
	in the TestExecurer/DescriptorImpl class. Namely, loadPropertiesFile() RPC function.
- Textbox for the environment variable in which the selected tests will be saved in.
- Textbox for the properties file path.
- Textbox for the description (the user can enter a description if he wants).

- Override section:
	In this section the user can override the properties he defined in the properties file or define them for the first time.
	This section contains of the following:
	* "Fetch properties From File" button - Call loadSettingsFromPropertiesFile function (javascript).
		This function retrieves all the properties that exist in the properties file and fill the appropriate fields with them.
	* "Show/Hide Available Fields" button - Call showHideAvailableFields function (javascript).
		This function will show/hide all the fields used in the tests the user defined in the properties file.
	* There are five optional blocks, one for each property.
		By clicking on each checkbox a textbox will appear. In this textbox the property content will be entered.
		To override a property the checkbox must be checked.

index.jelly
==================================================================
This file creates the plugin UI that appears after clicking on "build".

It contains:
-
- CSS section: Defines how the tree of tests will look.
- "Select All" button - Call selectGroupInDiv function (javascript).
	We call this function with a "true" value since we want all the tests to be selected.
	This function marks all nodes in the tree, and adds all of them to the selectedTests variable.
- "Unselect All" button - Call selectGroupInDiv function (javascript).
	We call this function with a "false" value since we want all the tests to not be selected.
	This function unmarks all nodes in the tree, and delete all of them from the selectedTests variable.
- TestTreeContainer - This div is initialized empty and will be filled by "loadTreeFromFile" function (javascript).
	
- Javascript object named "TestExecuterRPC" that will contain an object that will allow us to call RPC method
	in the TestExecurer class. Namely, loadPropertiesFile() RPC function.
- Call to the "loadTreeFromFile" function (javascript), which opens the file containing the tests and builds the tree.

To pass the selected tests to our TestExecuter class, we need to define a container named "parameters"
with a input field named "name" containing the name of the parameter.
For this we defined the following hidden input fields nested under a span name parameters:
- name - The name of the environment variable.
- selectedTests - A JSON array (as string) of the selected tests.

TestExecuter.js
==================================================================
This file includes all the functionality of the both the configuration and the build UI.

API functions:
-
* loadTreeFromFile(filePath, selectedTestsTextBoxName, testsTreeContainerName, fields)
	Load all tests from file. Build the tests tree and groups the tests. The          
	tests tree will be appended to testsTreeContainer. When tests are selected,       
	they will be written to selectedTestsTextBox. The parameters for building the     
	tree defined in the properties file and fields.
	The tree UI consists of:		
		* group checkbox - by clicking on this checkbox all the sub group will be selected/unselected 
			and will be added to the selectedTests variable. 
		* test checbox - by clicking on this checkbox, the test will be added to the selectedTests variable.
			if by clicking on this checkbox all the group is marked, then the group checkbox will be marked as well.
			if by clicking on this checkbox all the group is not marked, then the group checkbox will not be marked as well.
		* multiplicity textbox - by entering a number the number will be added to the appropriate test in the multiplicityField.
			if the value was not a number the textbox will be colored in red.
			if the value was 0 or not a number, then the number that will be saved will be 1.                                  
			                                                                          
	@param filePath                                                                   
			   The properties file path.                                              
	@param selectedTestsTextBoxName                                                   
			   The name of the selectedTests textbox.                                 
	@param testsTreeContainerName                                                     
			   The name of the testsTreeContainer div.                                
	@param fields                                                                     
			   A JSON object containing the fields to override - enableField,         
			   groupBy, fieldSeparator, showFields, multiplicityField.    
        
* loadSettingsFromPropertiesFile(propertiesFilePathTextBoxName, enableFieldTextBoxName, groupByTextBoxName, 
		showFieldsTextBoxName, multiplicityFieldTextBoxName, fieldSeparatorTextBoxName)
	Sets all override fields with the fields from the properties file. 
	Will show alert if at least one textbox isn't empty.               
			                                                           
	@param propertiesFilePathTextBoxName                               
	@param enableFieldTextBoxName                                      
	@param groupByTextBoxName                                          
	@param showFieldsTextBoxName                                       
	@param multiplicityFieldTextBoxName                                
	@param fieldSeparatorTextBoxName                                   


* showHideAvailableFields(button, uuid)
	Toggle Show/Hide the available fields next to the relavent textboxes in the 
	configuration UI. When showing the fields, it will load them from the       
	properties file entered in the UI.                                          
			                                                                    
	@param button                                                               
			   The button DOM element.                                          
	@param uuid                                                                 
			   The TestExecuter UUID.

* selectGroupInDiv(divName, check)
	Select/Unselect all the tests in a group.        
			                                         
	@param divName                                  
			   The div name containing the group.         
	@param check                                     
			   true for select. false for unselect.                                          

Helper functions:
-
* loadFileFromServer(filePath,callback)
	Load a file from file system using RPC. On error, an alert will be shown. On 
	success, the callback function will be called.                               
			                                                                     
	@param filePath                                                              
			   The path of the file in the file system.                          
	@param callback                                                              
			   A function that will be called on load success.                   

* overrideSettings(properties, fields)
	For each field that exist in fields, it will override this field in
	properties.                                                        
			                                                           
	@param properties                                                  
			   JSON object containing properties.                      
	@param fields                                                      
			   JSON object containing fields.                          

* loadTreeFromProperties(propertiesFileContent, fields)
	Load all tests from file. Build the tests tree and groups the tests. The      
	tests tree will be appended to testsTreeContainer. When tests are selected,   
	they will be written to selectedTestsTextBox. The parameters for building the 
	tree defined in the properties file and fields. testsTreeContainer and        
	selectedTestsTextBox defined in fields.                                       
			                                                                      
	@param propertiesFileContent                                                  
			   The content of the properties file.                                
	@param fields                                                                 
			   A JSON object containing the fields to override - enableField,     
			   groupBy, fieldSeparator, showFields, multiplicityField.            

* commaSeperatedToArray(str)
	Convert a list of elements as string to an array.                   
                                                                
	@param str                                                          
			   String where the elements in it are separated by comma.  
	@returns {Array} Consists all the elements from the string.         
	
* parseProperties(properties)
	Parse the tests (JSON string to JSON array).                         
	Group the tests and add 2 fields:                                    
	 - groups: All available group names in the tests (sorted by name).  
	 - groupsMap: map group name to an array of tests.                   
	Validate the rest of the fields and trim spaces if necessary.        
			                                                             
	@param properties                                                    
			   The properties.                                           

* getSortedGroups(groupsMap)
	@param groupsMap                            
			   A map of groups (name as key).   
	@returns {Array} Group names sorted by name.
	
* getGroups(properties)
	Groups the tests.                                                                
	@param properties                                                                
			   The properties.                                                       
	@returns {Object} Map group names to tests array (contains only tests with       
			 enableField = true). If there is a tests that doesn't have the          
			 property groupBy it will be in "UNGROUPED" group.                       
		
* loadTree(properties)
	Renders the tree to treeContainer 
			                          
	@param properties                 
			   The properties         

* createGroup(groupName, groupTests, properties)
	Create a group of tests for the tree and add it to the tree. 
			                                                     
	@param groupName                                             
			   The name of the group                             
	@param groupTests                                            
			   The tests belong to this group (array)            
	@param properties                                            
			   The properties                                    

* getMultiplicityAsInt(value)
	Convert multiplicity value from string to integer.                     
                                                                   
	@param value                                                           
			   {String} Multiplicity value                                 
	@returns {Integer} Multiplicity value. returns 0, if the value in not a
			 number or smaller then 0.                                     
		
* createTest(groupContainer, test, testIndex, groupState, properties)
	Create a test for a group in the tree and add it to the group in the tree.    
	                                                                          
	@param groupContainer                                                         
			   The group container (div).                                         
	@param test                                                                   
			   The test object.                                                   
	@param testIndex                                                              
			   The index of the test in the group array.                          
	@param groupState                                                             
			   An object allowing changing the group state (selected/unselected). 
	@param properties                                                             
			   The properties.                                                    
 

* selectTest(testIndex, dontCommit, select, properties)
	Add/Remove test from selected tests.             
                                             
	@param testIndex                                 
			   The test index in the group array.    
	@param dontCommit                                
			   Commit the changes if false.          
	@param select                                    
			   If true then add. Otherwise, remove.  
	@param properties                                
			   The properties.                       

* getShowString(test, properties)
	@param test                                                          
       The current test object.                                  
	@param properties                                                    
			   The properties.                                           
	@returns {String} Containing the fields the user wanted to see       
			 separated by the separator he chose, for the current test.  
                                                                 
	
* getTestComperator(fieldsToShow)
	@param fieldsToShow The fields that will be shown in the tree.                 
	@returns {Function} a compare function to use for the getSortedGroups function.

* readPropertiesData(propertiesData)
	Parse .properties files                           
			                                          
	@param data                                       
			   The properties file content.           
	@returns {Object} Key/Value map of the properties.
	
* setGroup(groupDiv, checkElement)
	Set the state of a group (selected/unselected). 
                                            
	@param groupDiv                                 
			   The div containing the group.        
	@param checkElement                             
			   true for select. false for unselect. 


* selectGroup(groupDiv, check)
	Select/Unselect all the tests in a group.        
			                                         
	@param groupDiv                                  
			   The div containing the group.         
	@param check                                     
			   true for select. false for unselect.  

* checkAll(checkboxes, check)  
	Check/Uncheck all checkboxes                  
			                                      
	@param checkboxes                             
			   {Array} Checkboxes                 
	@param check                                  
			   true for check. false for uncheck. 
	
* showHideGroup(groupDiv, button) 
	Switch the visibility of the tests of a group.      
                                                
	@param groupDiv                                     
			   A div containing the group to show/hide. 
	@param button                                       
			   The +/- button for the group.            
	
* getAllTestsFields(properties) 
	@param properties                                                           
       The properties.                                                  
	@returns {Object} Key/Value map of all fields exists in the tests property, 
			 mapped to the amount of tests it appears in.                       

* $get(name) 
	@param name                         
       The name of the textbox. 
	@returns The actual DOM element.    
                                
	
* isAllFieldsEmpty(fields)
	@param fields                                                           
			   The fields that appears in the override section (from the    
			   configuration UI).                                           
	@returns {Boolean} true if all empty.                                                                 

* setFieldBox(fieldBox, newValue)
	Set a textbox with a new value if the new value isn't empty. If the value     
	changes it will call onkeyup().                                               
			                                                                      
	@param fieldBox                                                               
			   The textbox DOM element.                                           
	@param newValue                                                               
			   {String} The new value.                                             

* loadSettings(propertiesFileContent, fields)
	Sets all override fields with the fields from the properties file.   
			                                                             
	@param propertiesFileContent                                         
			   The properties file content.                              
	@param fields                                                        
			   All fields.                                                

* getConfigFields(uuid)
	Get all the fields of the configuration UI based on uuid.       
			                                                        
	@param uuid                                                     
			   The TextExecuter UUID                                
	@returns {Object} The configuratio fields as Key/Value map.                                                   
                                                                           

* arrayToCommaSeperated(array)
	Convert an array of strings to a comma separated list. 
			                                               
	@param array                                           
			   Array of strings.                           
	@returns {String} A comma separated list.               

* setAvailableFields(propertiesFileContent, fields)                                                                            
	Show the available fields next to the relavent textboxes in the configuration 
	UI.                                                                           
			                                                                      
	@param propertiesFileContent                                                  
			   The properties file content.                                       
	@param fields                                                                 
			   The fields.                                                          

* setSelectionOptions(selectBox, availableFields, current)
	Add selection options for a select field.                                     
			                                                                      
	@param selectBox                                                              
			   The select box DOM element.                                        
	@param availableFields                                                        
			   All the fields available.                                          
	@param current                                                                
			   The current text entered in the textbox relavet to this select box.  

* addOption(container, value, title, isSelected)
	Add an option to a select box.                        
	@param container The select box DOM element.          
	@param value The value of the option to add.          
	@param title The title of the option to add.          
	@param isSelected Is this option should be selected.  
	@returns {DOM element} The DOM element of the option.   

* addToTextBoxList(fieldName, showFieldsTextBox)
	Add item to a comma separeted list in a textbox.
			                                        
	@param fieldName                                
			   The field to add to the list.        
	@param showFieldsTextBox                        
			   The textbox containing the list.      

* removeFromTextBoxList(fieldName, showFieldsTextBox)
	Remove item from a comma separeted list in a textbox. 
			                                              
	@param fieldName                                      
			   The field to remove from the list.         
	@param showFieldsTextBox                              
			   The textbox containing the list.             

* createFieldToShow(fieldList, fields, fieldName, count, total) 
	Create a list item for the available fields to show. Next to each field will  
	appear the amount of tests it appears in and an option to add/remove it from  
	the list.                                                                     
			                                                                      
	@param fieldList                                                              
			   The container of the fields.                                       
	@param fields                                                                 
			   The fields                                                         
	@param fieldName                                                              
			   The fields to create list item for.                                
	@param count                                                                  
			   The amount of times this field appear in the tests.                
	@param total                                                                  
			   The total amount of tests available.                               

* onPropertyChange(selectBoxName)
	On textbox edit, we need to update the relavent select box to show the
	default option.                                                       
			                                                              
	@param selectBoxName                                                  
			   The select box name.                                        
 
